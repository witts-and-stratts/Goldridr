import React from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { AdminProvider } from "./context"
import { AdminShell } from "./admin-shell"
import { QueryProvider } from "./query-provider"
import { adminPwaMetadata, adminPwaViewport } from "@/lib/admin-pwa-metadata"
import "@/styles/admin.css"
import "@/styles/admin-pwa.css"

export const instant = false
export const metadata = adminPwaMetadata
export const viewport = adminPwaViewport

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
