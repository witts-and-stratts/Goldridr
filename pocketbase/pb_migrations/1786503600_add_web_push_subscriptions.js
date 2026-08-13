migrate((app) => {
  const deliveries = app.findCollectionByNameOrId("notification_deliveries");
  const channel = deliveries.fields.getByName("channel");
  channel.values = [...new Set([...channel.values, "web_push"])];
  app.save(deliveries);

  const subscriptions = new Collection({
    type: "base",
    name: "web_push_subscriptions",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "userId", type: "text", required: true, max: 160 },
      { name: "endpoint", type: "text", required: true, max: 4096 },
      { name: "p256dh", type: "text", required: true, max: 500 },
      { name: "auth", type: "text", required: true, max: 500 },
      { name: "expirationTime", type: "number", onlyInt: true, min: 0 },
      { name: "userAgent", type: "text", max: 1000 },
      { name: "sourceCreatedAt", type: "date" },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_web_push_subscriptions_endpoint ON web_push_subscriptions (endpoint)",
      "CREATE INDEX idx_web_push_subscriptions_user ON web_push_subscriptions (userId)",
    ],
  });
  app.save(subscriptions);
}, (app) => {
  const subscriptions = app.findCollectionByNameOrId("web_push_subscriptions");
  if (subscriptions) app.delete(subscriptions);

  const deliveries = app.findCollectionByNameOrId("notification_deliveries");
  const channel = deliveries.fields.getByName("channel");
  channel.values = channel.values.filter((value) => value !== "web_push");
  app.save(deliveries);
});
