migrate((app) => {
  const users = app.findCollectionByNameOrId("app_users");

  const vehicles = new Collection({
    type: "base",
    name: "vehicles",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "make", type: "text", required: true, max: 120 },
      { name: "model", type: "text", required: true, max: 120 },
      { name: "year", type: "number", onlyInt: true, min: 1900, max: 2200 },
      { name: "colour", type: "text", max: 120 },
      { name: "plate", type: "text", max: 120 },
      { name: "status", type: "text", required: true, max: 80 },
      { name: "sourceCreatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_vehicles_legacy_id ON vehicles (legacyId)",
      "CREATE INDEX idx_vehicles_status ON vehicles (status)",
    ],
  });
  app.save(vehicles);

  const chauffeurs = new Collection({
    type: "base",
    name: "chauffeurs",
    listRule: "@request.auth.role = 'admin' || user = @request.auth.id",
    viewRule: "@request.auth.role = 'admin' || user = @request.auth.id",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "text", required: true, max: 160 },
      { name: "user", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
      { name: "name", type: "text", required: true, max: 160, presentable: true },
      { name: "email", type: "email", required: true },
      { name: "phone", type: "text", max: 120 },
      { name: "status", type: "text", required: true, max: 80 },
      { name: "vehicle", type: "relation", maxSelect: 1, collectionId: vehicles.id, cascadeDelete: false },
      { name: "avatarUrl", type: "text", max: 2000 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_chauffeurs_legacy_id ON chauffeurs (legacyId)",
      "CREATE UNIQUE INDEX idx_chauffeurs_email ON chauffeurs (email)",
      "CREATE UNIQUE INDEX idx_chauffeurs_user ON chauffeurs (user) WHERE user != ''",
      "CREATE INDEX idx_chauffeurs_status ON chauffeurs (status)",
    ],
  });
  app.save(chauffeurs);

  vehicles.listRule = "@request.auth.role = 'admin' || chauffeurs_via_vehicle.user ?= @request.auth.id";
  vehicles.viewRule = "@request.auth.role = 'admin' || chauffeurs_via_vehicle.user ?= @request.auth.id";
  app.save(vehicles);

  const bookings = new Collection({
    type: "base",
    name: "bookings",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "reference", type: "text", required: true, max: 160, presentable: true },
      { name: "tripType", type: "text", required: true, max: 120 },
      { name: "pickupDate", type: "text", required: true, max: 40 },
      { name: "pickupTime", type: "text", required: true, max: 40 },
      { name: "duration", type: "number", onlyInt: true, min: 0 },
      { name: "passengerName", type: "text", required: true, max: 200 },
      { name: "passengerEmail", type: "email", required: true },
      { name: "passengerPhone", type: "text", max: 120 },
      { name: "notes", type: "text", max: 10000 },
      { name: "status", type: "text", required: true, max: 80 },
      { name: "tripDetails", type: "json", maxSize: 1000000 },
      { name: "chauffeur", type: "relation", maxSelect: 1, collectionId: chauffeurs.id, cascadeDelete: false },
      { name: "smsConsentVersion", type: "text", max: 120 },
      { name: "smsConsentedAt", type: "date" },
      { name: "pin", type: "text", max: 40, hidden: true },
      { name: "pinConfirmedAt", type: "date" },
      { name: "sourceCreatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_bookings_legacy_id ON bookings (legacyId)",
      "CREATE UNIQUE INDEX idx_bookings_reference ON bookings (reference)",
      "CREATE INDEX idx_bookings_pickup ON bookings (pickupDate, pickupTime)",
      "CREATE INDEX idx_bookings_chauffeur ON bookings (chauffeur, pickupDate)",
      "CREATE INDEX idx_bookings_status ON bookings (status)",
    ],
  });
  app.save(bookings);

  const payments = new Collection({
    type: "base",
    name: "payments",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "booking", type: "relation", required: true, maxSelect: 1, collectionId: bookings.id, cascadeDelete: true },
      { name: "bookingReference", type: "text", required: true, max: 160 },
      { name: "amountCents", type: "number", onlyInt: true, min: 0 },
      { name: "currency", type: "text", required: true, max: 12 },
      { name: "method", type: "text", required: true, max: 120 },
      { name: "status", type: "text", required: true, max: 80 },
      { name: "transactionReference", type: "text", max: 255 },
      { name: "notes", type: "text", max: 10000 },
      { name: "paidAt", type: "date" },
      { name: "sourceCreatedAt", type: "date" },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_payments_legacy_id ON payments (legacyId)",
      "CREATE INDEX idx_payments_booking ON payments (booking, created)",
      "CREATE INDEX idx_payments_status ON payments (status, created)",
      "CREATE INDEX idx_payments_transaction_reference ON payments (transactionReference)",
    ],
  });
  app.save(payments);

  const discounts = new Collection({
    type: "base",
    name: "discount_codes",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "code", type: "text", required: true, max: 120, presentable: true },
      { name: "label", type: "text", required: true, max: 255 },
      { name: "kind", type: "text", required: true, max: 80 },
      { name: "value", type: "number", onlyInt: true, min: 0 },
      { name: "active", type: "bool" },
      { name: "maxRedemptions", type: "number", onlyInt: true, min: 0 },
      { name: "redemptions", type: "number", onlyInt: true, min: 0 },
      { name: "expiresAt", type: "date" },
      { name: "sourceCreatedAt", type: "date" },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_discount_codes_legacy_id ON discount_codes (legacyId)",
      "CREATE UNIQUE INDEX idx_discount_codes_code ON discount_codes (code)",
      "CREATE INDEX idx_discount_codes_active ON discount_codes (active, expiresAt)",
    ],
  });
  app.save(discounts);

  const blockedSlots = new Collection({
    type: "base",
    name: "blocked_slots",
    listRule: "@request.auth.role = 'admin' || chauffeur.user = @request.auth.id",
    viewRule: "@request.auth.role = 'admin' || chauffeur.user = @request.auth.id",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "title", type: "text", required: true, max: 500 },
      { name: "startDate", type: "text", required: true, max: 40 },
      { name: "startTime", type: "text", max: 40 },
      { name: "duration", type: "number", onlyInt: true, min: 0 },
      { name: "recurring", type: "text", required: true, max: 80 },
      { name: "endDate", type: "text", max: 40 },
      { name: "isFullDay", type: "bool" },
      { name: "chauffeur", type: "relation", maxSelect: 1, collectionId: chauffeurs.id, cascadeDelete: true },
      { name: "sourceCreatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_blocked_slots_legacy_id ON blocked_slots (legacyId)",
      "CREATE INDEX idx_blocked_slots_chauffeur_date ON blocked_slots (chauffeur, startDate)",
    ],
  });
  app.save(blockedSlots);

  const settings = new Collection({
    type: "base",
    name: "app_settings",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "key", type: "text", required: true, max: 255, presentable: true },
      { name: "value", type: "text", required: true, max: 100000 },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_app_settings_key ON app_settings (key)",
    ],
  });
  app.save(settings);

  const consents = new Collection({
    type: "base",
    name: "sms_consents",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "legacyId", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "customerEmail", type: "email", required: true },
      { name: "phone", type: "text", required: true, max: 120 },
      { name: "consentVersion", type: "text", required: true, max: 120 },
      { name: "consentedAt", type: "date", required: true },
      { name: "revokedAt", type: "date" },
      { name: "sourceCreatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_sms_consents_legacy_id ON sms_consents (legacyId)",
      "CREATE INDEX idx_sms_consents_customer ON sms_consents (customerEmail, phone)",
    ],
  });
  app.save(consents);
}, (app) => {
  for (const name of [
    "sms_consents",
    "app_settings",
    "blocked_slots",
    "discount_codes",
    "payments",
    "bookings",
    "chauffeurs",
    "vehicles",
  ]) {
    const collection = app.findCollectionByNameOrId(name);
    app.delete(collection);
  }
});
