"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { Button } from "@/components/admin-ui/button";
import { Checkbox } from "@/components/admin-ui/checkbox";
import { Input } from "@/components/admin-ui/input";
import { Separator } from "@/components/admin-ui/separator";
import type { Preference, AdminSettingsState } from "./types";
import { EMPTY_SETTINGS, NOTIFICATION_CATEGORIES, NOTIFICATION_CHANNELS } from "./constants";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [settings, setSettings] = useState<AdminSettingsState>(EMPTY_SETTINGS);
  const [settingsStatus, setSettingsStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data: settingsData } = useQuery({
    queryKey: qk.settings(),
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to load settings");
      return data.settings;
    },
  });

  const { data: preferencesData } = useQuery({
    queryKey: qk.notificationPreferences(),
    queryFn: async () => {
      const res = await fetch("/api/admin/notifications/preferences");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to load preferences");
      return data.preferences as Preference[];
    },
  });

  useEffect(() => {
    if (!settingsData) return;
    setSettings({
      bookingBufferMinutes: String(settingsData.bookingBufferMinutes ?? EMPTY_SETTINGS.bookingBufferMinutes),
      notificationTimezone: settingsData.notificationTimezone || EMPTY_SETTINGS.notificationTimezone,
      appUrl: settingsData.appUrl || EMPTY_SETTINGS.appUrl,
      emailFromName: settingsData.emailFromName || EMPTY_SETTINGS.emailFromName,
      emailFromAddress: settingsData.emailFromAddress || EMPTY_SETTINGS.emailFromAddress,
      emailReplyTo: settingsData.emailReplyTo || "",
      priceByMileAirport: String(settingsData.priceByMileAirport ?? EMPTY_SETTINGS.priceByMileAirport),
      priceByMileCity: String(settingsData.priceByMileCity ?? EMPTY_SETTINGS.priceByMileCity),
      priceByMileHourly: String(settingsData.priceByMileHourly ?? EMPTY_SETTINGS.priceByMileHourly),
      twilioFromNumber: settingsData.twilioFromNumber || EMPTY_SETTINGS.twilioFromNumber,
    });
  }, [settingsData]);

  useEffect(() => {
    if (preferencesData) setPreferences(preferencesData);
  }, [preferencesData]);

  const preferenceFor = (category: string) =>
    preferences.find(preference => preference.category === category)
    || { category, inApp: 1, email: 1, sms: 0 };

  const updatePreference = async (
    category: string,
    channel: "inApp" | "email" | "sms",
    checked: boolean
  ) => {
    const current = preferenceFor(category);
    const next = { ...current, [channel]: Number(checked) };
    setPreferences(values => [...values.filter(value => value.category !== category), next]);
    await fetch("/api/admin/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        inApp: Boolean(next.inApp),
        email: Boolean(next.email),
        sms: Boolean(next.sms),
      }),
    });
    queryClient.invalidateQueries({ queryKey: qk.notificationPreferences() });
  };

  const saveSettings = async () => {
    const minutes = Number(settings.bookingBufferMinutes);
    const airport = Number(settings.priceByMileAirport);
    const city = Number(settings.priceByMileCity);
    const hourly = Number(settings.priceByMileHourly);
    if (
      !Number.isInteger(minutes) || minutes < 0 || minutes > 240
      || !settings.notificationTimezone.trim()
      || !settings.appUrl.trim()
      || !settings.emailFromName.trim()
      || !settings.emailFromAddress.trim()
      || !Number.isFinite(airport) || airport < 0
      || !Number.isFinite(city) || city < 0
      || !Number.isFinite(hourly) || hourly < 0
      || !settings.twilioFromNumber.trim()
    ) {
      setSettingsStatus("error");
      return;
    }

    setSettingsStatus("saving");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingBufferMinutes: minutes,
          notificationTimezone: settings.notificationTimezone.trim(),
          appUrl: settings.appUrl.trim(),
          emailFromName: settings.emailFromName.trim(),
          emailFromAddress: settings.emailFromAddress.trim(),
          emailReplyTo: settings.emailReplyTo.trim(),
          priceByMileAirport: airport,
          priceByMileCity: city,
          priceByMileHourly: hourly,
          twilioFromNumber: settings.twilioFromNumber.trim(),
        }),
      });
      if (response.ok) {
        setSettingsStatus("saved");
        queryClient.invalidateQueries({ queryKey: qk.settings() });
      } else {
        setSettingsStatus("error");
      }
    } catch {
      setSettingsStatus("error");
    }
  };

  const updateField = (key: keyof AdminSettingsState, value: string) => {
    setSettings(current => ({ ...current, [key]: value }));
    if (settingsStatus !== "idle") setSettingsStatus("idle");
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure dispatch behavior here. Provider credentials and secrets still live in `.env`.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <p className="text-sm font-medium">Workspace</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Operational values that used to sit in environment files.</p>
        </aside>

        <section className="overflow-hidden rounded-lg border">
          <div className="bg-muted/30 px-5 py-4">
            <h2 className="text-sm font-semibold">Runtime configuration</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Changes take effect immediately for new requests and notifications.
            </p>
          </div>
          <Separator />
          <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Booking buffer minutes</span>
              <Input
                type="number"
                min={0}
                max={240}
                step={5}
                value={settings.bookingBufferMinutes}
                onChange={event => updateField("bookingBufferMinutes", event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Notification timezone</span>
              <Input
                value={settings.notificationTimezone}
                onChange={event => updateField("notificationTimezone", event.target.value)}
                placeholder="America/Chicago"
              />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">App URL</span>
              <Input
                value={settings.appUrl}
                onChange={event => updateField("appUrl", event.target.value)}
                placeholder="https://goldridr.com"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Email from name</span>
              <Input
                value={settings.emailFromName}
                onChange={event => updateField("emailFromName", event.target.value)}
                placeholder="Goldridr"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Email from address</span>
              <Input
                value={settings.emailFromAddress}
                onChange={event => updateField("emailFromAddress", event.target.value)}
                placeholder="notifications@example.com"
              />
            </label>
            <label className="grid gap-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">Reply-to address</span>
              <Input
                value={settings.emailReplyTo}
                onChange={event => updateField("emailReplyTo", event.target.value)}
                placeholder="support@example.com"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Airport price per mile</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={settings.priceByMileAirport}
                onChange={event => updateField("priceByMileAirport", event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">City price per mile</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={settings.priceByMileCity}
                onChange={event => updateField("priceByMileCity", event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Hourly price per mile</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={settings.priceByMileHourly}
                onChange={event => updateField("priceByMileHourly", event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Twilio from number</span>
              <Input
                value={settings.twilioFromNumber}
                onChange={event => updateField("twilioFromNumber", event.target.value)}
                placeholder="+17135550000"
              />
            </label>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center gap-3 px-5 py-5">
            <Button size="sm" onClick={saveSettings} disabled={settingsStatus === "saving"}>
              {settingsStatus === "saving" ? "Saving…" : "Save settings"}
            </Button>
            {settingsStatus === "saved" && <span className="text-xs text-muted-foreground">Saved.</span>}
            {settingsStatus === "error" && <span className="text-xs text-destructive">Check the values and try again.</span>}
          </div>
        </section>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <p className="text-sm font-medium">Notifications</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose where each kind of update should reach you.</p>
        </aside>

        <section className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,72px)] items-end gap-3 bg-muted/30 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Channel preferences</h2>
              <p className="mt-1 text-xs text-muted-foreground">Choose where each kind of update should reach you.</p>
            </div>
            {NOTIFICATION_CHANNELS.map(channel => (
              <div key={channel.value} className="text-center">
                <channel.icon className="mx-auto mb-1 size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">{channel.label}</span>
              </div>
            ))}
          </div>
          <Separator />
          {NOTIFICATION_CATEGORIES.map(category => {
            const preference = preferenceFor(category.value);
            return (
              <div key={category.value} className="grid grid-cols-[minmax(0,1fr)_repeat(3,72px)] items-center gap-3 border-b px-5 py-5 last:border-b-0">
                <div className="pr-6">
                  <p className="text-sm font-medium">{category.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{category.description}</p>
                </div>
                {NOTIFICATION_CHANNELS.map(channel => (
                  <div key={channel.value} className="flex justify-center">
                    <Checkbox
                      aria-label={`${category.label} via ${channel.label}`}
                      checked={Boolean(preference[channel.value])}
                      onCheckedChange={checked => updatePreference(category.value, channel.value, checked === true)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      </div>

    </div>
  );
}
