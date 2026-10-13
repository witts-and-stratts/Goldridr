import { NextResponse } from "next/server";
import { TemplateConflictError, TemplateNotFoundError } from "./template-store";

export function templateErrorResponse( error: unknown ): NextResponse {
  if ( error instanceof TemplateConflictError ) {
    return NextResponse.json(
      { success: false, error: "Revision conflict", expectedRevision: error.expectedRevision, actualRevision: error.actualRevision },
      { status: 409 }
    );
  }
  if ( error instanceof TemplateNotFoundError ) {
    return NextResponse.json( { success: false, error: error.message }, { status: 404 } );
  }
  const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : undefined;
  const message = error instanceof Error ? error.message : "Unknown template error";
  console.error( "admin.templates.failed", { errorName: error instanceof Error ? error.name : "Error", status, message } );
  return NextResponse.json( { success: false, error: "Template request failed" }, { status: status && status >= 400 && status < 600 ? status : 500 } );
}
