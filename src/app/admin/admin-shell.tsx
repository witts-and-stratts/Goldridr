"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/admin-ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AdminSidebar } from "@/components/admin-sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function AdminShell( { children }: { children: React.ReactNode } ) {
  const pathname = usePathname();
  const segments = pathname.replace( /^\/admin\/?/, "" ).split( "/" ).filter( Boolean );
  const crumb = segments.length > 0
    ? segments[ segments.length - 1 ].charAt( 0 ).toUpperCase() + segments[ segments.length - 1 ].slice( 1 )
    : null;

  return (
    <div className="admin-dashboard">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                {crumb && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{crumb}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto min-h-0">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
