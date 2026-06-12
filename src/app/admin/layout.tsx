import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AdminProvider } from "./context"
import { AdminShell } from "./admin-shell"
import "./admin.css"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <AdminProvider session={session}>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  )
}
