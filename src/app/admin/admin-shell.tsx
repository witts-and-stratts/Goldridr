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
import { AdminPwa } from "@/components/admin-pwa";
import { useAdmin } from "./context";

function label( s: string ) {
  return s.charAt( 0 ).toUpperCase() + s.slice( 1 );
}

export function AdminShell( { children }: { children: React.ReactNode } ) {
  const pathname = usePathname();
  const { chauffeurs } = useAdmin();
  const segments = pathname.replace( /^\/admin\/?/, "" ).split( "/" ).filter( Boolean );

  // Build breadcrumb items: resolve known dynamic segments to human-readable names.
  type CrumbItem = { label: string; href?: string };
  const crumbs: CrumbItem[] = [];

  for ( let i = 0; i < segments.length; i++ ) {
    const seg = segments[ i ];
    const prev = segments[ i - 1 ];
    const isLast = i === segments.length - 1;
    const href = "/admin/" + segments.slice( 0, i + 1 ).join( "/" );

    if ( prev === "chauffeurs" ) {
      const name = chauffeurs.find( ( c ) => c.id === seg )?.name;
      crumbs.push( { label: name ?? label( seg ), href: isLast ? undefined : href } );
    } else {
      crumbs.push( { label: label( seg ), href: isLast ? undefined : href } );
    }
  }

  return (
    <div className="admin-dashboard">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="admin-topbar flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
              <BreadcrumbList className="flex-nowrap overflow-hidden">
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                </BreadcrumbItem>
                {crumbs.map( ( c, i ) => (
                  <React.Fragment key={i}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="min-w-0">
                      {c.href ? (
                        <BreadcrumbLink className="truncate" href={c.href}>{c.label}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ) )}
              </BreadcrumbList>
            </Breadcrumb>
            <AdminPwa showInstallPrompt />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto min-h-0">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
