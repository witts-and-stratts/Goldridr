import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ChauffeursLayout( { children }: { children: ReactNode } ) {
  const session = await getSession();
  if ( session?.role !== "admin" ) redirect( "/admin" );
  return children;
}
