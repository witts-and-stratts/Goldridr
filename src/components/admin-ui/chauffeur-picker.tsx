"use client"

import * as React from "react"
import { Check, ChevronDown, UserX } from "lucide-react"
import { Avatar, AvatarFallback } from "./avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { cn } from "@/lib/utils"

interface Chauffeur {
  id: string
  name: string
  email?: string
}

interface ChauffeurPickerProps {
  chauffeurs: Chauffeur[]
  value: string | null | undefined
  onChange: (id: string | null) => void
  disabled?: boolean
  className?: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// Deterministic soft color from name
const COLORS = [
  "bg-blue-500/20 text-blue-600",
  "bg-purple-500/20 text-purple-600",
  "bg-green-500/20 text-green-600",
  "bg-orange-500/20 text-orange-600",
  "bg-pink-500/20 text-pink-600",
  "bg-teal-500/20 text-teal-600",
  "bg-indigo-500/20 text-indigo-600",
  "bg-rose-500/20 text-rose-600",
]

function colorFor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function ChauffeurPicker({ chauffeurs, value, onChange, disabled, className }: ChauffeurPickerProps) {
  const selected = chauffeurs.find((c) => c.id === value) ?? null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {selected ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarFallback className={cn("text-[10px]", colorFor(selected.name))}>
                  {getInitials(selected.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left font-medium">{selected.name}</span>
            </>
          ) : (
            <>
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40">
                <UserX className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left text-muted-foreground">Unassigned</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Assign Chauffeur</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-2.5"
            onClick={() => onChange(null)}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/30">
              <UserX className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground">Unassigned</span>
            {value == null && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>

          {chauffeurs.map((c) => (
            <DropdownMenuItem
              key={c.id}
              className="gap-2.5"
              onClick={() => onChange(c.id)}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className={cn("text-[10px]", colorFor(c.name))}>
                  {getInitials(c.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{c.name}</span>
                {c.email && (
                  <span className="text-[10px] text-muted-foreground truncate">{c.email}</span>
                )}
              </div>
              {value === c.id && <Check className="ml-auto h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── AvatarGroup — shows stacked avatars (e.g. assigned team) ─────────────────
interface AvatarGroupProps {
  chauffeurs: Chauffeur[]
  max?: number
  size?: "sm" | "md"
}

export function AvatarGroup({ chauffeurs, max = 3, size = "md" }: AvatarGroupProps) {
  const shown = chauffeurs.slice(0, max)
  const overflow = chauffeurs.length - max

  const dim = size === "sm" ? "h-6 w-6" : "h-8 w-8"
  const text = size === "sm" ? "text-[9px]" : "text-[11px]"

  return (
    <div className="flex items-center -space-x-2">
      {shown.map((c) => (
        <Avatar key={c.id} className={cn(dim, "ring-2 ring-background")}>
          <AvatarFallback className={cn(text, colorFor(c.name))}>
            {getInitials(c.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className={cn(
          dim,
          "ring-2 ring-background rounded-full bg-muted flex items-center justify-center",
          text, "font-semibold text-muted-foreground"
        )}>
          +{overflow}
        </div>
      )}
    </div>
  )
}
