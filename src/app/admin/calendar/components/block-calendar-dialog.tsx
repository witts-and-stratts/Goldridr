"use client";

import { Lock, CalendarIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Badge } from "@/components/admin-ui/badge";
import { Checkbox } from "@/components/admin-ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin-ui/popover";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/admin-ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin-ui/select";
import { format } from "date-fns";
import type { BlockedSlot } from "../types";

interface Chauffeur {
  id: string;
  name: string;
}

interface BlockForm {
  title: string;
  date: string;
  endDate: string;
  fullDay: boolean;
  time: string;
  duration: number;
  recurring: string;
  chauffeurId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blockedSlots: BlockedSlot[];
  chauffeurs: Chauffeur[];
  isAdmin: boolean;
  form: BlockForm;
  onFormChange: (patch: Partial<BlockForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteBlock: (id: number) => void;
}

export function BlockCalendarDialog({
  open, onOpenChange, blockedSlots, chauffeurs, isAdmin,
  form, onFormChange, onSubmit, onDeleteBlock,
}: Props) {
  const formatDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 p-5 border-b border-border">
          <Lock className="size-4 text-destructive" />
          <DialogTitle className="text-base font-semibold">Block Calendar Availability</DialogTitle>
        </div>
        <DialogDescription className="sr-only">Schedule blockouts on the calendar</DialogDescription>
        <div className="grid md:grid-cols-[1.1fr_1fr] divide-x divide-border max-h-[70vh] overflow-y-auto">
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">New Blockout</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Title / Reason</label>
              <Input required placeholder="e.g. Fleet Maintenance" value={form.title} onChange={(e) => onFormChange({ title: e.target.value })} />
            </div>
            {isAdmin && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Block Target</label>
                <Select value={form.chauffeurId || "__global__"} onValueChange={(v) => onFormChange({ chauffeurId: v === "__global__" ? "" : v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Global — all chauffeurs" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__global__">Global — all chauffeurs</SelectItem>
                    {chauffeurs.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="fullDay" checked={form.fullDay} onCheckedChange={(checked) => onFormChange({ fullDay: checked === true })} />
              <label htmlFor="fullDay" className="text-xs font-medium cursor-pointer select-none">All-day blockout</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start font-normal text-xs h-9">
                      <CalendarIcon className="size-3.5 mr-2 text-muted-foreground" />
                      {form.date ? format(new Date(`${form.date}T00:00:00`), "PPP") : <span className="text-muted-foreground">Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" autoFocus
                      selected={form.date ? new Date(`${form.date}T00:00:00`) : undefined}
                      onSelect={(d) => onFormChange({ date: d ? formatDateStr(d) : "" })} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">End Date (optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" disabled={form.recurring !== "none"} className="w-full justify-start font-normal text-xs h-9">
                      <CalendarIcon className="size-3.5 mr-2 text-muted-foreground" />
                      {form.endDate ? format(new Date(`${form.endDate}T00:00:00`), "PPP") : <span className="text-muted-foreground">Pick date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" autoFocus
                      selected={form.endDate ? new Date(`${form.endDate}T00:00:00`) : undefined}
                      onSelect={(d) => onFormChange({ endDate: d ? formatDateStr(d) : "" })} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {!form.fullDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Start Time</label>
                  <Input type="time" required value={form.time} onChange={(e) => onFormChange({ time: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Duration (min)</label>
                  <Input type="number" min="1" required value={form.duration} onChange={(e) => onFormChange({ duration: parseInt(e.target.value) || 60 })} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Recurrence</label>
              <Select value={form.recurring} onValueChange={(v) => onFormChange({ recurring: v, endDate: v !== "none" ? "" : form.endDate })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="weekends">Weekends only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="destructive" className="w-full">
              <Lock className="size-3.5" /> Create Blockout
            </Button>
          </form>

          <div className="p-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Active Blockouts ({blockedSlots.length})
            </p>
            <div className="space-y-2 overflow-y-auto max-h-[50vh]">
              {blockedSlots.map((block) => {
                const c = chauffeurs.find((ch) => ch.id === block.chauffeurId);
                return (
                  <div key={block.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{block.title}</p>
                        {c && <Badge variant="secondary" className="text-[9px] h-4 px-1">{c.name.split(" ")[0]}</Badge>}
                        {block.recurring !== "none" && <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{block.recurring}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(`${block.date}T00:00:00`), "MMM dd, yyyy")}
                        {block.endDate && ` – ${format(new Date(`${block.endDate}T00:00:00`), "MMM dd, yyyy")}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {block.isFullDay === 1 ? "All day" : `${block.time} · ${block.duration}min`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => onDeleteBlock(block.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
              {blockedSlots.length === 0 && (
                <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                  <Lock className="size-8 opacity-20" />
                  <p className="text-xs">No blockouts scheduled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
