import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicFile = (name: string) => new URL(`../public/${name}`, import.meta.url);
const projectFile = (name: string) => new URL(`../${name}`, import.meta.url);

test("admin manifest launches the standalone admin app with complete icons", async () => {
  const manifest = JSON.parse(await readFile(publicFile("admin.webmanifest"), "utf8"));

  assert.equal(manifest.id, "/admin");
  assert.equal(manifest.start_url, "/admin");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.deepEqual(
    manifest.icons.map((icon: { sizes: string; purpose: string }) => [icon.sizes, icon.purpose]),
    [["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]],
  );
});

test("admin service worker only falls back for admin and login navigations", async () => {
  const worker = await readFile(publicFile("admin-sw.js"), "utf8");

  assert.match(worker, /request\.method !== "GET"/);
  assert.match(worker, /PRECACHE_URLS\.includes\(url\.pathname\)/);
  assert.match(worker, /request\.mode !== "navigate"/);
  assert.match(worker, /url\.pathname\.startsWith\("\/admin"\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/login"\)/);
  assert.doesNotMatch(worker, /cache\.put/);
  assert.doesNotMatch(worker, /request\.method === "POST"/);
});

test("admin service worker displays native notifications and deep-links inbox items", async () => {
  const worker = await readFile(publicFile("admin-sw.js"), "utf8");

  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /registration\.showNotification/);
  assert.match(worker, /renotify: true/);
  assert.match(worker, /addEventListener\("notificationclick"/);
  assert.match(worker, /action: "mark_read"/);
  assert.match(worker, /clients\.matchAll/);
  assert.match(worker, /clients\.openWindow/);
});

test("native notification registration is admin-only and validates subscriptions", async () => {
  const route = await readFile(projectFile("src/app/api/admin/push-subscription/route.ts"), "utf8");
  const settings = await readFile(projectFile("src/app/admin/settings/components/native-notification-settings.tsx"), "utf8");

  assert.match(route, /isAdmin\( session \)/);
  assert.match(route, /export async function GET/);
  assert.match(route, /getWebPushConfiguration/);
  assert.match(route, /webPushSubscriptionSchema\.safeParse/);
  assert.match(route, /export async function PUT/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /export async function POST/);
  assert.match(settings, /fetch\( "\/api\/admin\/push-subscription"/);
  assert.doesNotMatch(settings, /process\.env\.NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
});

test("admin shell shows new inbox events as deduplicated foreground toasts", async () => {
  const bell = await readFile(projectFile("src/components/notifications/NotificationBell.tsx"), "utf8");

  assert.match(bell, /addEventListener\( "notification"/);
  assert.match(bell, /toast\.info/);
  assert.match(bell, /id: foreground\.id/);
  assert.match(bell, /router\.push\( foreground\.href \)/);
});

test("shared inbox creation mirrors recipients to Web Push without blocking the event", async () => {
  const notifications = await readFile(projectFile("src/lib/pocketbase/notifications.ts"), "utf8");

  assert.match(notifications, /await enqueueWebPushDeliveries\( notification, recipients \)\.catch/);
  assert.match(notifications, /Unable to enqueue Web Push deliveries/);
});

test("offline page discloses that admin changes are not queued", async () => {
  const offlinePage = await readFile(publicFile("admin-offline.html"), "utf8");
  assert.match(offlinePage, /needs a secure connection/i);
  assert.match(offlinePage, /changes have not been queued/i);
});
