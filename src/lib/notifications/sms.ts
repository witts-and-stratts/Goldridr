import twilio, { type Twilio } from "twilio";
import { insertMockSmsMessage } from "@/lib/db";
import { getSmsConfig } from "./config";

export interface RenderedSms {
  from: string;
  to: string;
  body: string;
}

export interface SmsSendResult {
  provider: "twilio" | "mock";
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SmsTransport {
  verify(): Promise<void>;
  send(message: RenderedSms): Promise<SmsSendResult>;
  close(): Promise<void>;
}

class TwilioSmsTransport implements SmsTransport {
  private readonly client: Twilio;

  constructor(
    private readonly accountSid: string,
    authToken: string
  ) {
    this.client = twilio( accountSid, authToken );
  }

  async verify(): Promise<void> {
    await this.client.api.accounts( this.accountSid ).fetch();
  }

  async send( message: RenderedSms ): Promise<SmsSendResult> {
    const response = await this.client.messages.create( {
      from: message.from,
      to: message.to,
      body: message.body,
    } );

    return {
      provider: "twilio",
      sid: response.sid,
      status: response.status || "queued",
      to: message.to,
      from: message.from,
      body: message.body,
      metadata: { accountSid: this.accountSid },
    };
  }

  async close(): Promise<void> {}
}

class MockSmsTransport implements SmsTransport {
  async verify(): Promise<void> {}

  async send( message: RenderedSms ): Promise<SmsSendResult> {
    const record = insertMockSmsMessage( {
      fromNumber: message.from,
      toNumber: message.to,
      body: message.body,
      status: "queued",
    } );
    return {
      provider: "mock",
      sid: record.sid,
      status: record.status,
      to: record.toNumber,
      from: record.fromNumber,
      body: record.body,
      metadata: { id: record.id },
    };
  }

  async close(): Promise<void> {}
}

export function createSmsTransport(): SmsTransport {
  const config = getSmsConfig();
  if ( config.transport === "mock" ) return new MockSmsTransport();
  return new TwilioSmsTransport( config.accountSid, config.authToken );
}
