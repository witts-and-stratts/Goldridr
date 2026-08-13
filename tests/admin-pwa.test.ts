import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicFile = (name: string) => new URL(`../public/${name}`, import.meta.url);

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

test("offline page discloses that admin changes are not queued", async () => {
  const offlinePage = await readFile(publicFile("admin-offline.html"), "utf8");
  assert.match(offlinePage, /needs a secure connection/i);
  assert.match(offlinePage, /changes have not been queued/i);
});
