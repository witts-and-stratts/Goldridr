"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, CalendarDays, Users, BookOpen,
  ShieldCheck, ChevronRight, ChevronDown, Check,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu"
import { useAdmin } from "@/app/admin/context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const navSections = [
  {
    label: "Overview",
    defaultOpen: true,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
    ],
  },
  {
    label: "Dispatch",
    defaultOpen: true,
    items: [
      { label: "Bookings", icon: BookOpen,     href: "/admin/bookings"  },
      { label: "Calendar", icon: CalendarDays, href: "/admin/calendar"  },
    ],
  },
  {
    label: "Management",
    defaultOpen: true,
    items: [
      { label: "Chauffeurs", icon: Users, href: "/admin/chauffeurs" },
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

function RoleSwitcher() {
  const { chauffeurs, currentRole, setCurrentRole } = useAdmin()
  const isAdmin = currentRole.type === "admin"
  const label   = isAdmin ? "General Dispatcher" : currentRole.name!
  const avatarColor = isAdmin ? "bg-primary/15 text-primary" : colorFor(label)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className={cn("text-[10px] font-semibold", avatarColor)}>
              {isAdmin ? <ShieldCheck className="size-3.5" /> : initials(label)}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-left text-sm font-medium text-sidebar-foreground truncate">
            {label}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start" side="right">
        <DropdownMenuLabel className="text-xs">Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2.5" onClick={() => {
            setCurrentRole({ type: "admin" })
            toast.success("Viewing as General Dispatcher")
          }}>
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-primary/15 text-primary">
                <ShieldCheck className="size-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm">General Dispatcher</span>
              <span className="text-[10px] text-muted-foreground">Admin — full access</span>
            </div>
            {isAdmin && <Check className="ml-auto size-4 shrink-0" />}
          </DropdownMenuItem>

          {chauffeurs.length > 0 && <DropdownMenuSeparator />}

          {chauffeurs.map(c => (
            <DropdownMenuItem key={c.id} className="gap-2.5" onClick={() => {
              setCurrentRole({ type: "chauffeur", id: c.id, name: c.name })
              toast.success(`Viewing as ${c.name}`)
            }}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className={cn("text-[10px] font-semibold", colorFor(c.name))}>
                  {initials(c.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">{c.name}</span>
                <span className="text-[10px] text-muted-foreground">Chauffeur</span>
              </div>
              {currentRole.type === "chauffeur" && currentRole.id === c.id && (
                <Check className="ml-auto size-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      {/* Brand header */}
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          {/* Full logo — shown when sidebar is expanded */}
          <Image
            src="/assets/images/goldridr-logo-main.svg"
            alt="Goldridr"
            width={120}
            height={28}
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
        <RoleSwitcher />
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent className="gap-0">
        {navSections.map(section => (
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
                    {section.items.map(item => {
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
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-sidebar-foreground">Online</span>
            <span className="text-[10px] text-muted-foreground">System active</span>
          </div>
          <div className="size-2 rounded-full bg-green-500 animate-pulse" title="Online" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
