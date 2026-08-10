"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, CalendarDays, Users, BookOpen,
  ShieldCheck, ChevronRight, LogOut, Mail, Settings,
  TestTube2, CreditCard, TicketPercent, ScanLine, Car,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/admin-ui/avatar"
import { useAdmin } from "@/app/admin/context"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Button } from "@/components/admin-ui/button"

const navSections = [
  {
    label: "Overview",
    defaultOpen: true,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
      { label: "Inbox", icon: Mail, href: "/admin/notifications" },
      { label: "Settings", icon: Settings, href: "/admin/settings" },
      { label: "Testing", icon: TestTube2, href: "/admin/testing", adminOnly: true, developmentOnly: true },
    ],
  },
  {
    label: "Dispatch",
    defaultOpen: true,
    items: [
      { label: "Bookings", icon: BookOpen,     href: "/admin/bookings"  },
      { label: "Calendar", icon: CalendarDays, href: "/admin/calendar"  },
      { label: "Scan",     icon: ScanLine,     href: "/admin/scan"      },
      { label: "Payments", icon: CreditCard, href: "/admin/payments", adminOnly: true },
      { label: "Discounts", icon: TicketPercent, href: "/admin/discounts", adminOnly: true },
    ],
  },
  {
    label: "Management",
    defaultOpen: true,
    items: [
      { label: "Chauffeurs", icon: Users, href: "/admin/chauffeurs" },
      { label: "Vehicles", icon: Car, href: "/admin/vehicles" },
    ],
  },
]

const COLORS = [
  "bg-blue-500/20 text-blue-600",
  "bg-purple-500/20 text-purple-600",
  "bg-green-500/20 text-green-600",
  "bg-orange-500/20 text-orange-600",
  "bg-pink-500/20 text-pink-600",
  "bg-teal-500/20 text-teal-600",
]

function colorFor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
}

function AccountSummary() {
  const { session } = useAdmin()
  const isAdmin = session.role === "admin"
  const label = session.name
  const avatarColor = isAdmin ? "bg-primary/15 text-primary" : colorFor(label)

  return (
    <div className="flex w-full items-center gap-2 px-2 py-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className={cn("text-[10px] font-semibold", avatarColor)}>
          {isAdmin ? <ShieldCheck className="size-3.5" /> : initials(label)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {isAdmin ? "Administrator" : "Chauffeur"}
        </p>
      </div>
    </div>
  )
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useAdmin()

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.replace("/login")
    router.refresh()
  }

  return (
    <Sidebar {...props}>
      {/* Brand header */}
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          {/* Full logo — shown when sidebar is expanded */}
          <Image
            src="/assets/images/goldridr-logo-main.svg"
            alt="Goldridr"
            width={231}
            height={48}
            className="h-7 w-auto object-contain group-data-[collapsible=icon]:hidden dark:invert"
            priority
          />
          {/* Symbol only — shown when sidebar is collapsed to icon rail */}
          <Image
            src="/assets/images/goldridr-symbol.svg"
            alt="Goldridr"
            width={28}
            height={28}
            className="hidden h-7 w-7 object-contain group-data-[collapsible=icon]:block dark:invert"
            priority
          />
        </div>
        <AccountSummary />
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent className="gap-0">
        {navSections
          .filter(section => session.role === "admin" || section.label !== "Management")
          .map(section => (
          <Collapsible
            key={section.label}
            defaultOpen={section.defaultOpen}
            className="group/collapsible"
          >
            <SidebarGroup>
              <SidebarGroupLabel
                className="group/label text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                render={<CollapsibleTrigger />}
              >
                {section.label}
                <ChevronRight className="ml-auto size-3.5 transition-transform group-data-open/collapsible:rotate-90" />
              </SidebarGroupLabel>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items
                      .filter(item => (!("adminOnly" in item) || session.role === "admin")
                        && (!("developmentOnly" in item) || process.env.NODE_ENV === "development"))
                      .map(item => {
                      const isActive =
                        item.href === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.href)
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={item.label}
                            render={<Link href={item.href} />}
                          >
                            <item.icon className="size-4 shrink-0" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer */}
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground" onClick={logout}>
          <LogOut className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
