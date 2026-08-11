import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { WebhookLogsPage } from "./webhook-logs-page";

export const instant = false;

export default async function LogsPage() {
  const session = await getSession();
  if ( !isAdmin( session ) ) redirect( "/admin" );
  return <WebhookLogsPage />;
}
