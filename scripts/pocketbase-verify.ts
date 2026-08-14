import PocketBase from "pocketbase";
import { EventSource } from "eventsource";

globalThis.EventSource = EventSource as unknown as typeof globalThis.EventSource;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const url = requiredEnv("POCKETBASE_URL");
const superuserEmail = requiredEnv("POCKETBASE_SUPERUSER_EMAIL");
const superuserPassword = requiredEnv("POCKETBASE_SUPERUSER_PASSWORD");

async function main() {
  const pb = new PocketBase(url);
  await pb.collection("_superusers").authWithPassword(superuserEmail, superuserPassword);

  const suffix = `${Date.now()}`;
  const legacyId = Number(suffix);
  const email = `verify-${suffix}@example.invalid`;
  let userId = "";
  let notificationId = "";
  let recipientId = "";
  let settingId = "";

  try {
  await pb.health.check();
  await pb.collection("calendar_feed_tokens").getList(1, 1, { fields: "id" });
  const setting = await pb.collection("app_settings").create({
    key: `deploymentVerification:${suffix}`,
    value: "ok",
    sourceUpdatedAt: new Date().toISOString(),
  });
  settingId = setting.id;
  const persistedSetting = await pb.collection("app_settings").getOne(settingId);
  if (persistedSetting.value !== "ok") throw new Error("Settings persistence verification failed");
  const user = await pb.collection("app_users").create({
    email,
    password: `Verify-${suffix}-Aa1!`,
    passwordConfirm: `Verify-${suffix}-Aa1!`,
    name: "PocketBase verification",
    legacyUserId: `verify-${suffix}`,
    role: "chauffeur",
    status: "active",
  });
  userId = user.id;

  let received = false;
  const unsubscribe = await pb.collection("notification_recipients").subscribe("*", (event) => {
    if (event.record.userId === `verify-${suffix}`) received = true;
  }, { filter: `userId = "verify-${suffix}"` });

  const notification = await pb.collection("notifications").create({
    legacyId,
    type: "system",
    category: "system",
    eventKey: `verify-${suffix}`,
    title: "PocketBase verification",
    body: "Realtime notification verification",
    metadata: { verification: true },
  });
  notificationId = notification.id;

  const recipient = await pb.collection("notification_recipients").create({
    legacyId: legacyId + 1,
    notification: notificationId,
    userId: `verify-${suffix}`,
  });
  recipientId = recipient.id;

  await new Promise((resolve) => setTimeout(resolve, 500));
  await unsubscribe();
  if (!received) throw new Error("Realtime recipient event was not received");

  await pb.collection("notification_recipients").update(recipientId, {
    readAt: new Date().toISOString(),
  });
  const updated = await pb.collection("notification_recipients").getOne(recipientId);
  if (!updated.readAt) throw new Error("Notification read state was not persisted");

  console.log("PocketBase health, settings persistence, calendar feed tokens, auth collection, notifications, and realtime verified.");
  } finally {
    if (settingId) await pb.collection("app_settings").delete(settingId).catch(() => undefined);
    if (recipientId) await pb.collection("notification_recipients").delete(recipientId).catch(() => undefined);
    if (notificationId) await pb.collection("notifications").delete(notificationId).catch(() => undefined);
    if (userId) await pb.collection("app_users").delete(userId).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
