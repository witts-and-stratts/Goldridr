import { notFound } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { listTemplateViews } from "@/lib/notifications/template-store";
import { TemplatesDashboard } from "./templates-dashboard";

export const instant = false;

export default async function TemplatesPage() {
  const session = await getSession();
  if ( !isAdmin( session ) ) notFound();

  const templates = await listTemplateViews();

  return <TemplatesDashboard templates={ templates } />;
}
