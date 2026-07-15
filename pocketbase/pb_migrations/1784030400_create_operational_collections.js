migrate((app) => {
  const passwordResetTokens = new Collection({
    type: "base",
    name: "password_reset_tokens",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "tokenHash", type: "text", required: true, max: 128 },
      { name: "chauffeur", type: "relation", required: true, maxSelect: 1, collectionId: app.findCollectionByNameOrId("chauffeurs").id, cascadeDelete: true },
      { name: "expiresAt", type: "date", required: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_password_reset_tokens_hash ON password_reset_tokens (tokenHash)",
      "CREATE UNIQUE INDEX idx_password_reset_tokens_chauffeur ON password_reset_tokens (chauffeur)",
    ],
  });
  app.save(passwordResetTokens);

  const mockSmsMessages = new Collection({
    type: "base",
    name: "mock_sms_messages",
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "sid", type: "text", required: true, max: 64, presentable: true },
      { name: "accountSid", type: "text", max: 64 },
      { name: "fromNumber", type: "text", required: true, max: 120 },
      { name: "toNumber", type: "text", required: true, max: 120 },
      { name: "body", type: "text", required: true, max: 10000 },
      { name: "status", type: "text", required: true, max: 80 },
      { name: "errorMessage", type: "text", max: 10000 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_mock_sms_messages_sid ON mock_sms_messages (sid)",
      "CREATE INDEX idx_mock_sms_messages_created ON mock_sms_messages (created DESC)",
    ],
  });
  app.save(mockSmsMessages);

  const pushReceipts = new Collection({
    type: "base",
    name: "push_receipts",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "ticketId", type: "text", required: true, max: 255, presentable: true },
      { name: "token", type: "text", required: true, max: 500 },
      { name: "status", type: "text", required: true, max: 80 },
      { name: "attempts", type: "number", required: true, onlyInt: true, min: 0 },
      { name: "nextCheckAt", type: "date", required: true },
      { name: "receipt", type: "json", maxSize: 200000 },
      { name: "lastError", type: "text", max: 10000 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_push_receipts_ticket ON push_receipts (ticketId)",
      "CREATE INDEX idx_push_receipts_due ON push_receipts (status, nextCheckAt)",
    ],
  });
  app.save(pushReceipts);
}, (app) => {
  for (const name of [ "push_receipts", "mock_sms_messages", "password_reset_tokens" ]) {
    app.delete(app.findCollectionByNameOrId(name));
  }
});
