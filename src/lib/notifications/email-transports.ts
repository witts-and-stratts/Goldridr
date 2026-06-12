import nodemailer, { type Transporter } from "nodemailer";
import { GetSendQuotaCommand, SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { Resend } from "resend";
import { getEmailConfig } from "./config";
import type { EmailSendResult, EmailTransport, RenderedEmail } from "./types";

class SmtpEmailTransport implements EmailTransport {
  private readonly transporter: Transporter;

  constructor(
    private readonly provider: "smtp" | "ses_smtp",
    config: { host: string; port: number; secure: boolean; user: string; password: string }
  ) {
    this.transporter = nodemailer.createTransport( {
      host: config.host,
      port: config.port,
      secure: config.secure,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: { user: config.user, pass: config.password },
    } );
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async send( message: RenderedEmail ): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail( {
      from: message.from,
      replyTo: message.replyTo,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: {
        "X-Goldridr-Idempotency-Key": message.idempotencyKey,
        "X-Goldridr-Notification-Id": message.tags?.notification_id || "",
      },
    } );
    return {
      provider: this.provider,
      messageId: info.messageId,
      accepted: ( info.accepted || [] ).map( String ),
      rejected: ( info.rejected || [] ).map( String ),
      response: info.response,
      metadata: { envelope: info.envelope },
    };
  }

  async close(): Promise<void> {
    this.transporter.close();
  }
}

class MailpitEmailTransport implements EmailTransport {
  private readonly transporter: Transporter;

  constructor(
    config: { host: string; port: number; secure: boolean }
  ) {
    this.transporter = nodemailer.createTransport( {
      host: config.host,
      port: config.port,
      secure: config.secure,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    } );
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async send( message: RenderedEmail ): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail( {
      from: message.from,
      replyTo: message.replyTo,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: {
        "X-Goldridr-Idempotency-Key": message.idempotencyKey,
        "X-Goldridr-Notification-Id": message.tags?.notification_id || "",
      },
    } );
    return {
      provider: "mailpit",
      messageId: info.messageId,
      accepted: ( info.accepted || [] ).map( String ),
      rejected: ( info.rejected || [] ).map( String ),
      response: info.response,
      metadata: { envelope: info.envelope },
    };
  }

  async close(): Promise<void> {
    this.transporter.close();
  }
}

class SesApiEmailTransport implements EmailTransport {
  private readonly client: SESClient;

  constructor(
    region: string,
    private readonly configurationSet?: string
  ) {
    this.client = new SESClient( { region } );
  }

  async verify(): Promise<void> {
    await this.client.send( new GetSendQuotaCommand( {} ) );
  }

  async send( message: RenderedEmail ): Promise<EmailSendResult> {
    const response = await this.client.send( new SendEmailCommand( {
      Source: message.from,
      ReplyToAddresses: message.replyTo ? [ message.replyTo ] : undefined,
      Destination: { ToAddresses: message.to },
      Message: {
        Subject: { Charset: "UTF-8", Data: message.subject },
        Body: {
          Html: { Charset: "UTF-8", Data: message.html },
          Text: { Charset: "UTF-8", Data: message.text },
        },
      },
      ConfigurationSetName: this.configurationSet,
      Tags: Object.entries( message.tags || {} )
        .filter( ( [ , value ] ) => value )
        .map( ( [ Name, Value ] ) => ( { Name, Value } ) ),
    } ) );
    return {
      provider: "ses_api",
      messageId: response.MessageId || "",
      accepted: message.to,
      rejected: [],
      metadata: { requestId: response.$metadata.requestId },
    };
  }

  async close(): Promise<void> {
    this.client.destroy();
  }
}

class ResendEmailTransport implements EmailTransport {
  private readonly client: Resend;

  constructor( apiKey: string ) {
    this.client = new Resend( apiKey );
  }

  async verify(): Promise<void> {
    const response = await this.client.domains.list();
    if ( response.error ) throw new Error( response.error.message );
  }

  async send( message: RenderedEmail ): Promise<EmailSendResult> {
    const response = await this.client.emails.send( {
      from: message.from,
      replyTo: message.replyTo,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: Object.entries( message.tags || {} )
        .filter( ( [ , value ] ) => value )
        .map( ( [ name, value ] ) => ( { name, value } ) ),
    }, { idempotencyKey: message.idempotencyKey } );
    if ( response.error ) {
      const error = new Error( response.error.message ) as Error & { statusCode?: number };
      error.statusCode = response.error.statusCode ?? undefined;
      throw error;
    }
    return {
      provider: "resend",
      messageId: response.data?.id || "",
      accepted: message.to,
      rejected: [],
      metadata: response.data ? { ...response.data } : undefined,
    };
  }

  async close(): Promise<void> {}
}

export function createEmailTransport(): EmailTransport {
  const config = getEmailConfig();
  if ( config.transport === "resend" ) {
    return new ResendEmailTransport( config.apiKey );
  }
  if ( config.transport === "mailpit" ) {
    return new MailpitEmailTransport( {
      host: config.host,
      port: config.port,
      secure: config.secure,
    } );
  }
  if ( config.transport === "smtp" || config.transport === "ses_smtp" ) {
    return new SmtpEmailTransport( config.transport, config );
  }
  return new SesApiEmailTransport( config.region, config.configurationSet );
}
