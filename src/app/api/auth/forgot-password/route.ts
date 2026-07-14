import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getChauffeurByEmail, createPasswordResetToken } from "@/lib/db";
import { createEmailTransport } from "@/lib/notifications/email-transports";
import { getEmailConfig } from "@/lib/notifications/config";

export async function POST( request: Request ) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if ( !email ) {
      return NextResponse.json( { success: false, error: "Email is required" }, { status: 400 } );
    }

    const chauffeur = await getChauffeurByEmail( email );

    if ( chauffeur ) {
      const token = await createPasswordResetToken( chauffeur.id );
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "http://localhost:3000";
      const resetUrl = `${ baseUrl }/reset-password/${ token }`;

      try {
        const config = await getEmailConfig();
        const from = `${ config.fromName } <${ config.fromAddress }>`;
        const transport = await createEmailTransport();
        await transport.send( {
          from,
          to: [ chauffeur.email ],
          subject: "Reset your Goldridr password",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#fff">
              <h2 style="margin:0 0 8px;font-size:20px;color:#b99a56">Reset your password</h2>
              <p style="margin:0 0 24px;color:#aaa;font-size:14px">
                Hi ${ chauffeur.name }, we received a request to reset your Goldridr password.
                Click the button below — this link expires in 1&nbsp;hour.
              </p>
              <a href="${ resetUrl }"
                 style="display:inline-block;padding:12px 24px;background:#b99a56;color:#000;text-decoration:none;font-weight:600;font-size:14px">
                Reset password
              </a>
              <p style="margin:24px 0 0;color:#555;font-size:12px">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
          text: `Reset your Goldridr password\n\nHi ${ chauffeur.name },\n\nClick the link below to reset your password (expires in 1 hour):\n\n${ resetUrl }\n\nIf you didn't request this, ignore this email.`,
          idempotencyKey: randomUUID(),
        } );
        await transport.close();
      } catch ( emailError ) {
        console.error( "Failed to send password reset email:", emailError );
      }
    }

    // Always return success to avoid leaking whether the email exists
    return NextResponse.json( { success: true } );
  } catch {
    return NextResponse.json( { success: false, error: "Something went wrong" }, { status: 500 } );
  }
}
