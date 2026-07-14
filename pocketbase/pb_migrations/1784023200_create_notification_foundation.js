migrate((app) => {
  const users = new Collection({
    type: "auth",
    name: "app_users",
    listRule: "id = @request.auth.id",
    viewRule: "id = @request.auth.id",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    authRule: "status = 'active'",
    passwordAuth: {
      enabled: true,
      identityFields: [ "email" ],
    },
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "name", type: "text", required: true, max: 160, presentable: true },
      { name: "legacyUserId", type: "text", required: true, max: 160 },
      { name: "role", type: "select", required: true, maxSelect: 1, values: [ "admin", "chauffeur" ] },
      { name: "status", type: "select", required: true, maxSelect: 1, values: [ "active", "inactive" ] },
      { name: "chauffeurId", type: "text", max: 160 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_app_users_legacy_user_id ON app_users (legacyUserId)",
      "CREATE UNIQUE INDEX idx_app_users_chauffeur_id ON app_users (chauffeurId) WHERE chauffeurId != ''",
    ],
  });
  app.save(users);

  const notifications = new Collection({
    type: "base",
    name: "notifications",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", onlyInt: true, min: 1 },
      { name: "eventKey", type: "text", required: true, max: 255 },
      { name: "type", type: "text", required: true, max: 120 },
      { name: "category", type: "select", required: true, maxSelect: 1, values: [ "bookings", "reminders", "messages", "system" ] },
      { name: "title", type: "text", required: true, max: 500 },
      { name: "body", type: "text", required: true, max: 5000 },
      { name: "bookingReference", type: "text", max: 160 },
      { name: "actorUserId", type: "text", max: 160 },
      { name: "metadata", type: "json", maxSize: 200000 },
      { name: "sourceCreatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_notifications_event_key ON notifications (eventKey)",
      "CREATE UNIQUE INDEX idx_notifications_legacy_id ON notifications (legacyId) WHERE legacyId > 0",
      "CREATE INDEX idx_notifications_booking_reference ON notifications (bookingReference)",
    ],
  });
  app.save(notifications);

  const recipients = new Collection({
    type: "base",
    name: "notification_recipients",
    listRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    viewRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    createRule: null,
    updateRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    deleteRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", onlyInt: true, min: 1 },
      {
        name: "notification",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: notifications.id,
        cascadeDelete: true,
      },
      { name: "userId", type: "text", required: true, max: 160 },
      { name: "readAt", type: "date" },
      { name: "sourceCreatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_notification_recipient_identity ON notification_recipients (notification, userId)",
      "CREATE UNIQUE INDEX idx_notification_recipients_legacy_id ON notification_recipients (legacyId) WHERE legacyId > 0",
      "CREATE INDEX idx_notification_recipients_user ON notification_recipients (userId, created)",
    ],
  });
  app.save(recipients);

  notifications.listRule = "@request.auth.role = 'admin' || notification_recipients_via_notification.userId ?= @request.auth.legacyUserId";
  notifications.viewRule = "@request.auth.role = 'admin' || notification_recipients_via_notification.userId ?= @request.auth.legacyUserId";
  app.save(notifications);

  const preferences = new Collection({
    type: "base",
    name: "notification_preferences",
    listRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    viewRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    createRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    updateRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    deleteRule: "userId = @request.auth.legacyUserId || @request.auth.role = 'admin'",
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "userId", type: "text", required: true, max: 160 },
      { name: "category", type: "select", required: true, maxSelect: 1, values: [ "bookings", "reminders", "messages", "system" ] },
      { name: "inApp", type: "bool" },
      { name: "email", type: "bool" },
      { name: "sms", type: "bool" },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_notification_preferences_identity ON notification_preferences (userId, category)",
    ],
  });
  app.save(preferences);

  const deliveries = new Collection({
    type: "base",
    name: "notification_deliveries",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", onlyInt: true, min: 1 },
      {
        name: "notification",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: notifications.id,
        cascadeDelete: true,
      },
      { name: "channel", type: "select", required: true, maxSelect: 1, values: [ "in_app", "email", "sms" ] },
      { name: "recipient", type: "text", required: true, max: 500 },
      { name: "template", type: "text", max: 160 },
      { name: "payload", type: "json", maxSize: 500000 },
      { name: "idempotencyKey", type: "text", required: true, max: 255 },
      { name: "status", type: "select", required: true, maxSelect: 1, values: [ "pending", "processing", "delivered", "failed", "dead_letter", "cancelled" ] },
      { name: "scheduledAt", type: "date", required: true },
      { name: "nextAttemptAt", type: "date", required: true },
      { name: "attempts", type: "number", onlyInt: true, min: 0 },
      { name: "leaseToken", type: "text", max: 255 },
      { name: "leaseExpiresAt", type: "date" },
      { name: "provider", type: "text", max: 120 },
      { name: "providerMessageId", type: "text", max: 500 },
      { name: "accepted", type: "json", maxSize: 200000 },
      { name: "rejected", type: "json", maxSize: 200000 },
      { name: "response", type: "text", max: 10000 },
      { name: "providerMetadata", type: "json", maxSize: 500000 },
      { name: "lastError", type: "text", max: 10000 },
      { name: "sourceCreatedAt", type: "date" },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_notification_deliveries_idempotency ON notification_deliveries (idempotencyKey)",
      "CREATE UNIQUE INDEX idx_notification_deliveries_legacy_id ON notification_deliveries (legacyId) WHERE legacyId > 0",
      "CREATE INDEX idx_notification_deliveries_claim ON notification_deliveries (status, nextAttemptAt, leaseExpiresAt)",
      "CREATE INDEX idx_notification_deliveries_provider ON notification_deliveries (provider, providerMessageId)",
    ],
  });
  app.save(deliveries);

  const pushTokens = new Collection({
    type: "base",
    name: "push_tokens",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "token", type: "text", required: true, max: 500 },
      { name: "userId", type: "text", required: true, max: 160 },
      { name: "platform", type: "select", required: true, maxSelect: 1, values: [ "ios", "android", "web", "unknown" ] },
      { name: "sourceCreatedAt", type: "date" },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_push_tokens_token ON push_tokens (token)",
      "CREATE INDEX idx_push_tokens_user ON push_tokens (userId)",
    ],
  });
  app.save(pushTokens);

  const providerEvents = new Collection({
    type: "base",
    name: "notification_provider_events",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", onlyInt: true, min: 1 },
      { name: "provider", type: "text", required: true, max: 120 },
      { name: "providerEventId", type: "text", required: true, max: 500 },
      { name: "providerMessageId", type: "text", max: 500 },
      { name: "eventType", type: "text", required: true, max: 160 },
      { name: "payload", type: "json", maxSize: 1000000 },
      { name: "sourceReceivedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_notification_provider_event_identity ON notification_provider_events (provider, providerEventId)",
      "CREATE UNIQUE INDEX idx_notification_provider_events_legacy_id ON notification_provider_events (legacyId) WHERE legacyId > 0",
    ],
  });
  app.save(providerEvents);
}, (app) => {
  for (const name of [
    "notification_provider_events",
    "push_tokens",
    "notification_deliveries",
    "notification_preferences",
    "notification_recipients",
    "notifications",
    "app_users",
  ]) {
    const collection = app.findCollectionByNameOrId(name);
    app.delete(collection);
  }
});
