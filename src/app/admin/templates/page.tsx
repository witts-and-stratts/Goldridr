import { notFound } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth";
import { buildSmsBody } from "@/lib/notifications/sms-program";
import { renderEmailPreview } from "@/lib/notifications/email-template";
import { EMAIL_TEMPLATES, PDF_TEMPLATES, SMS_TEMPLATES } from "@/lib/template-catalog";
import { TemplatesDashboard } from "./templates-dashboard";

export default async function TemplatesPage() {
  if ( process.env.NODE_ENV !== "development" ) notFound();
  const session = await getSession();
  if ( !isAdmin( session ) ) notFound();

  const sms = SMS_TEMPLATES.map( template => ( {
    id: template.id,
    name: template.name,
    label: template.label,
    description: template.description,
    body: buildSmsBody( template.name, template.payload ),
  } ) );

  const emails = await Promise.all(
    EMAIL_TEMPLATES.map( async template => ( {
      id: template.id,
      name: template.name,
      label: template.label,
      description: template.description,
      ...( await renderEmailPreview( template.name, template.payload ) ),
    } ) )
  );

  const pdfs = PDF_TEMPLATES.map( template => ( { ...template } ) );

  return <TemplatesDashboard sms={ sms } emails={ emails } pdfs={ pdfs } />;
}
