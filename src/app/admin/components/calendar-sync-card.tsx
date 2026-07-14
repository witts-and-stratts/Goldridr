"use client";

import { useState } from "react";
import { CalendarIcon, Check, Copy, Globe, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Separator } from "@/components/admin-ui/separator";

function getCalLinks() {
  if (typeof window === "undefined") return { webcal: "", google: "", raw: "" };
  const raw = `${window.location.protocol}//${window.location.host}/api/admin/bookings/feed`;
  return {
    webcal: `webcal://${window.location.host}/api/admin/bookings/feed`,
    google: `https://www.google.com/calendar/render?cid=${encodeURIComponent(raw)}`,
    raw,
  };
}

export function CalendarSyncCard() {
  const [copied, setCopied] = useState(false);
  const links = getCalLinks();

  const copyFeed = () => {
    navigator.clipboard.writeText(links.raw);
    setCopied(true);
    toast.success("Feed URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Calendar Sync Feed</CardTitle>
        </div>
        <CardDescription>
          Subscribe to get all bookings in Google Calendar or Apple Calendar. Updates automatically.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={links.webcal}><Smartphone className="size-3.5" /> Apple Calendar</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={links.google} target="_blank" rel="noopener noreferrer">
              <Globe className="size-3.5" /> Google Calendar
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={copyFeed}>
            {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
            Copy Feed URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
