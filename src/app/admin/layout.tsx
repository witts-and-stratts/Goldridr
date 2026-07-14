import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AdminProvider } from "./context"
import { AdminShell } from "./admin-shell"
import { QueryProvider } from "./query-provider"
import "./admin.css"

export const instant = false

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <QueryProvider>
      <AdminProvider session={session}>
        <AdminShell>{children}</AdminShell>
      </AdminProvider>
    </QueryProvider>
  )
}
