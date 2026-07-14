"use client";

import Link from "next/link";
import {
  Car, PencilLine, Camera, MoreVertical, BookOpen, CalendarDays, KeyRound, Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/admin-ui/avatar";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin-ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { Separator } from "@/components/admin-ui/separator";
import type { AdminChauffeur } from "../types";
import { formatPrice } from "../utils";
import type { getStats } from "../utils";

interface ChauffeurCardProps {
  chauffeur: AdminChauffeur;
  stats: ReturnType<typeof getStats>;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: () => void;
  onChangePassword: () => void;
  onAvatarPick: () => void;
  onAssignVehicle: () => void;
  onDelete: () => void;
}

export function ChauffeurCard({
  chauffeur: c,
  stats: s,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onChangePassword,
  onAvatarPick,
  onAssignVehicle,
  onDelete,
}: ChauffeurCardProps) {
  return (
    <DropdownMenu
      open={menuOpenId === c.id}
      onOpenChange={(open) => onMenuOpenChange(open ? c.id : null)}
    >
      <Card className="hover:border-border/80 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="size-10">
              <AvatarImage src={c.avatarUrl ?? undefined} alt={c.name} />
              <AvatarFallback>{c.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">
                <Link href={`/admin/chauffeurs/${c.id}`} className="hover:underline underline-offset-2">
                  {c.name}
                </Link>
              </CardTitle>
              <CardDescription className="truncate">{c.email}</CardDescription>
            </div>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground ml-auto"
                aria-label={`Open actions for ${c.name}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{s.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-500">{s.confirmed}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmed</p>
            </div>
            <div>
              <p className="text-lg font-bold">{s.upcoming}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Upcoming</p>
            </div>
          </div>
          <Separator className="my-3" />
          {c.vehicle ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Car className="size-3.5 shrink-0" />
              <span className="truncate">
                {[c.vehicle.year, c.vehicle.make, c.vehicle.model].filter(Boolean).join(" ")}
                {c.vehicle.plate ? ` · ${c.vehicle.plate}` : ""}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Revenue generated</p>
              <p className="text-sm font-semibold">{formatPrice(s.revenue)}</p>
            </div>
            {s.pending > 0 && (
              <Link href={`/admin/bookings?chauffeur=${c.id}&status=pending`}>
                <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs hover:bg-yellow-500/25 transition-colors">
                  {s.pending} pending
                </Badge>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuItem onClick={onEdit}>
          <PencilLine className="size-3.5" /> Edit Chauffeur
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onChangePassword}>
          <KeyRound className="size-3.5" /> Change Password
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAvatarPick}>
          <Camera className="size-3.5" /> Change Avatar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAssignVehicle}>
          <Car className="size-3.5" /> {c.vehicle ? "Change Vehicle" : "Assign Vehicle"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/bookings/chauffeur/${c.id}`}>
            <BookOpen className="size-3.5" /> View Bookings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/calendar?chauffeur=${c.id}`}>
            <CalendarDays className="size-3.5" /> View Calendar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete Chauffeur
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
