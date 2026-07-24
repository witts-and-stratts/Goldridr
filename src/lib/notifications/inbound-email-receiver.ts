import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { Resend } from "resend";
import { recordInboundEmail } from "./inbound-email";

type InboundTransport = "disabled" | "mailpit" | "webmail_imap" | "resend";

interface InboundEmailReceiver {
  readonly transport: InboundTransport;
  verify(): Promise<void>;
  poll(): Promise<number>;
  receiveResendEvent?( emailId: string, fallback: { from?: string; to?: string[]; subject?: string; createdAt?: string } ): Promise<number | undefined>;
}

function positiveInteger( value: string | undefined, fallback: number ): number {
  const parsed = Number( value );
  return Number.isSafeInteger( parsed ) && parsed > 0 ? parsed : fallback;
}

export function selectedInboundTransport(): InboundTransport {
  const configured = process.env.EMAIL_INBOUND_TRANSPORT?.trim().toLowerCase() || "auto";
  if ( configured === "disabled" ) return "disabled";
  if ( configured === "mailpit" || configured === "resend" || configured === "webmail_imap" ) return configured;
  if ( process.env.EMAIL_TRANSPORT === "mailpit" ) return "mailpit";
  if ( process.env.EMAIL_TRANSPORT === "resend" ) return "resend";
  return process.env.WEBMAIL_IMAP_USER?.trim() && process.env.WEBMAIL_IMAP_PASSWORD
    ? "webmail_imap"
    : "disabled";
}

type MailpitAddress = { address?: string };

type MailpitMessage = {
  id?: string;
  message_id?: string;
  from?: MailpitAddress;
  to?: MailpitAddress[];
  subject?: string;
  created?: string;
  text?: string;
  headers?: Record<string, string | string[]>;
};

type MailpitMessagesResponse = { messages?: MailpitMessage[] };

class DisabledInboundEmailReceiver implements InboundEmailReceiver {
  readonly transport = "disabled" as const;
  async verify(): Promise<void> {}
  async poll(): Promise<number> { return 0; }
}

class WebmailImapReceiver implements InboundEmailReceiver {
  readonly transport = "webmail_imap" as const;
  private lastPollAt = 0;
  private readonly host = process.env.WEBMAIL_IMAP_HOST?.trim() || "mail.privateemail.com";
  private readonly port = positiveInteger( process.env.WEBMAIL_IMAP_PORT, 993 );
  private readonly user = process.env.WEBMAIL_IMAP_USER?.trim() || "";
  private readonly password = process.env.WEBMAIL_IMAP_PASSWORD || "";
  private readonly mailbox = process.env.WEBMAIL_IMAP_MAILBOX?.trim() || "INBOX";
  private readonly pollMs = positiveInteger( process.env.EMAIL_INBOUND_POLL_MS, 60_000 );
  private readonly scanLimit = positiveInteger( process.env.EMAIL_INBOUND_SCAN_LIMIT, 50 );

  private assertConfigured(): void {
    if ( !this.user || !this.password ) throw new Error( "WEBMAIL_IMAP_USER and WEBMAIL_IMAP_PASSWORD are required for inbound webmail" );
  }

  private client(): ImapFlow {
    return new ImapFlow( {
      host: this.host,
      port: this.port,
      secure: true,
      auth: { user: this.user, pass: this.password },
      logger: false,
    } );
  }

  async verify(): Promise<void> {
    this.assertConfigured();
    const client = this.client();
    try {
      await client.connect();
    } finally {
      await client.logout().catch( () => undefined );
    }
  }

  async poll(): Promise<number> {
    if ( Date.now() - this.lastPollAt < this.pollMs ) return 0;
    this.lastPollAt = Date.now();
    this.assertConfigured();
    const client = this.client();
    let created = 0;
    try {
      await client.connect();
      const lock = await client.getMailboxLock( this.mailbox );
      try {
        let scanned = 0;
        for await ( const message of client.fetch( "*:1", { uid: true, source: true }, { uid: true } ) ) {
          if ( !message.source ) continue;
          const parsed = await simpleParser( message.source );
          const result = await recordInboundEmail( {
            provider: "webmail_imap",
            providerMessageId: parsed.messageId || `${ this.mailbox }:${ message.uid }`,
            from: parsed.from?.text || "",
            to: ( Array.isArray( parsed.to ) ? parsed.to[ 0 ]?.text : parsed.to?.text ) || this.user,
            subject: parsed.subject || "",
            text: parsed.text || "",
            receivedAt: parsed.date?.toISOString(),
            messageId: parsed.messageId,
            inReplyTo: parsed.inReplyTo,
          } );
          if ( result.created ) created++;
          scanned++;
          if ( scanned >= this.scanLimit ) break;
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch( () => undefined );
    }
    return created;
  }
}

class MailpitInboundEmailReceiver implements InboundEmailReceiver {
  readonly transport = "mailpit" as const;
  private lastPollAt = 0;
  private readonly apiUrl = ( process.env.MAILPIT_API_URL?.trim() || process.env.NEXT_PUBLIC_MAILPIT_UI_URL?.trim() || "http://127.0.0.1:8025" ).replace( /\/$/, "" );
  private readonly inboundTo = process.env.MAILPIT_INBOUND_TO?.trim().toLowerCase() || "support@example.com";
  private readonly pollMs = positiveInteger( process.env.EMAIL_INBOUND_POLL_MS, 60_000 );
  private readonly scanLimit = positiveInteger( process.env.EMAIL_INBOUND_SCAN_LIMIT, 50 );

  private async request<T>( path: string ): Promise<T> {
    const response = await fetch( `${ this.apiUrl }${ path }`, { cache: "no-store" } );
    if ( !response.ok ) throw new Error( `Mailpit API request failed (${ response.status })` );
    return await response.json() as T;
  }

  private isInbound( message: MailpitMessage ): boolean {
    return ( message.to || [] ).some( recipient => recipient.address?.trim().toLowerCase() === this.inboundTo );
  }

  private header( message: MailpitMessage, name: string ): string | undefined {
    const value = Object.entries( message.headers || {} ).find( ( [ key ] ) => key.toLowerCase() === name )?.[ 1 ];
    return Array.isArray( value ) ? value[ 0 ] : value;
  }

  async verify(): Promise<void> {
    await this.request<MailpitMessagesResponse>( "/api/v1/messages?limit=1" );
  }

  async poll(): Promise<number> {
    if ( Date.now() - this.lastPollAt < this.pollMs ) return 0;
    this.lastPollAt = Date.now();
    const response = await this.request<MailpitMessagesResponse>( `/api/v1/messages?limit=${ this.scanLimit }` );
    let created = 0;
    for ( const summary of response.messages || [] ) {
      if ( !summary.id || !this.isInbound( summary ) ) continue;
      const message = await this.request<MailpitMessage>( `/api/v1/message/${ encodeURIComponent( summary.id ) }` );
      const result = await recordInboundEmail( {
        provider: "mailpit",
        providerMessageId: message.id || summary.id,
        from: message.from?.address || summary.from?.address || "",
        to: ( message.to || summary.to || [] ).map( recipient => recipient.address ).filter( Boolean ).join( "," ),
        subject: message.subject || summary.subject || "",
        text: message.text || "",
        receivedAt: message.created || summary.created,
        messageId: message.message_id || summary.message_id,
        inReplyTo: this.header( message, "in-reply-to" ),
      } );
      if ( result.created ) created++;
    }
    return created;
  }
}

class ResendInboundEmailReceiver implements InboundEmailReceiver {
  readonly transport = "resend" as const;
  private readonly apiKey = process.env.RESEND_API_KEY?.trim() || "";

  private client(): Resend {
    if ( !this.apiKey ) throw new Error( "RESEND_API_KEY is required for inbound Resend email" );
    return new Resend( this.apiKey );
  }

  async verify(): Promise<void> { this.client(); }
  async poll(): Promise<number> { return 0; }

  async receiveResendEvent( emailId: string, fallback: { from?: string; to?: string[]; subject?: string; createdAt?: string } ): Promise<number | undefined> {
    const response = await this.client().emails.receiving.get( emailId );
    if ( response.error || !response.data ) throw new Error( response.error?.message || "Unable to retrieve received email from Resend" );
    const email = response.data;
    const result = await recordInboundEmail( {
      provider: "resend",
      providerMessageId: emailId,
      from: email.from || fallback.from || "",
      to: email.to?.join( "," ) || fallback.to?.join( "," ) || "",
      subject: email.subject || fallback.subject || "",
      text: email.text || "",
      receivedAt: email.created_at || fallback.createdAt,
      messageId: email.headers?.[ "message-id" ] || undefined,
      inReplyTo: email.headers?.[ "in-reply-to" ] || undefined,
    } );
    return result.created ? result.notificationId : undefined;
  }
}

export function createInboundEmailReceiver(): InboundEmailReceiver {
  const transport = selectedInboundTransport();
  if ( transport === "mailpit" ) return new MailpitInboundEmailReceiver();
  if ( transport === "resend" ) return new ResendInboundEmailReceiver();
  if ( transport === "webmail_imap" ) return new WebmailImapReceiver();
  return new DisabledInboundEmailReceiver();
}
