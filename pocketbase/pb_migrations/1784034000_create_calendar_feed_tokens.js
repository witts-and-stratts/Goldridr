migrate((app) => {
  const tokens = new Collection({
    type: "base",
    name: "calendar_feed_tokens",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "tokenHash", type: "text", required: true, max: 128 },
      { name: "createdBy", type: "text", required: true, max: 255 },
      { name: "revokedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_calendar_feed_tokens_hash ON calendar_feed_tokens (tokenHash)",
    ],
  });
  app.save(tokens);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("calendar_feed_tokens"));
});
