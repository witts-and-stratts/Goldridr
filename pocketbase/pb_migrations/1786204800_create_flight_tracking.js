migrate((app) => {
  const bookings = app.findCollectionByNameOrId("bookings");

  const snapshots = new Collection({
    type: "base",
    name: "flight_snapshots",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "lookupKey", type: "text", required: true, max: 255 },
      { name: "flightIata", type: "text", required: true, max: 16 },
      { name: "flightDate", type: "text", required: true, max: 10 },
      { name: "direction", type: "select", required: true, maxSelect: 1, values: ["to_airport", "from_airport"] },
      { name: "provider", type: "text", required: true, max: 120 },
      { name: "status", type: "text", required: true, max: 80 },
      { name: "snapshot", type: "json", required: true, maxSize: 200000 },
      { name: "observedAt", type: "date", required: true },
      { name: "expiresAt", type: "date", required: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_flight_snapshots_lookup ON flight_snapshots (lookupKey)",
      "CREATE INDEX idx_flight_snapshots_expiry ON flight_snapshots (expiresAt)",
    ],
  });
  app.save(snapshots);

  const tracking = new Collection({
    type: "base",
    name: "flight_tracking",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "booking", type: "relation", required: true, maxSelect: 1, collectionId: bookings.id, cascadeDelete: true },
      { name: "snapshot", type: "relation", maxSelect: 1, collectionId: snapshots.id, cascadeDelete: false },
      { name: "lookupKey", type: "text", required: true, max: 255 },
      { name: "active", type: "bool", required: true },
      { name: "nextCheckAt", type: "date", required: true },
      { name: "lastCheckedAt", type: "date" },
      { name: "lastAlertFingerprint", type: "text", max: 500 },
      { name: "alertBaseline", type: "json", maxSize: 200000 },
      { name: "lastStatus", type: "text", max: 80 },
      { name: "lastError", type: "text", max: 10000 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_flight_tracking_booking ON flight_tracking (booking)",
      "CREATE INDEX idx_flight_tracking_due ON flight_tracking (active, nextCheckAt)",
    ],
  });
  app.save(tracking);

  const events = new Collection({
    type: "base",
    name: "flight_provider_events",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "eventType", type: "select", required: true, maxSelect: 1, values: ["cache_hit", "cache_miss", "provider_request", "provider_success", "provider_failure", "parse_failure", "alert"] },
      { name: "provider", type: "text", required: true, max: 120 },
      { name: "lookupKey", type: "text", required: true, max: 255 },
      { name: "success", type: "bool", required: true },
      { name: "durationMs", type: "number", required: true, onlyInt: true, min: 0 },
      { name: "metadata", type: "json", maxSize: 200000 },
      { name: "occurredAt", type: "date", required: true },
    ],
    indexes: [
      "CREATE INDEX idx_flight_provider_events_time ON flight_provider_events (occurredAt DESC)",
      "CREATE INDEX idx_flight_provider_events_type ON flight_provider_events (eventType, provider)",
    ],
  });
  app.save(events);
}, (app) => {
  for (const name of ["flight_provider_events", "flight_tracking", "flight_snapshots"]) {
    const collection = app.findCollectionByNameOrId(name);
    if (collection) app.delete(collection);
  }
});
