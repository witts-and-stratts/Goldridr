import { notFound, redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { WebhookLogsPage } from "../webhook-logs-page";
import type { LogProvider } from "../types";

const providers = new Set<LogProvider>( [ "twilio", "resend", "ses" ] );

export const instant = false;

export default async function ProviderLogsPage( { params }: { params: Promise<{ provider: string }> } ) {
  const session = await getSession();
  if ( !isAdmin( session ) ) redirect( "/admin" );
  const { provider } = await params;
  if ( !providers.has( provider as LogProvider ) ) notFound();
  return <WebhookLogsPage provider={provider as LogProvider} />;
}
