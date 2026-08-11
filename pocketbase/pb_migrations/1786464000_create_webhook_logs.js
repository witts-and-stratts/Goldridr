migrate((app) => {
  const logs = new Collection({
    type: "base",
    name: "webhook_logs",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "requestId", type: "text", required: true, max: 80 },
      { name: "provider", type: "select", required: true, maxSelect: 1, values: ["twilio", "resend", "ses"] },
      { name: "endpoint", type: "text", required: true, max: 500 },
      { name: "method", type: "text", required: true, max: 16 },
      { name: "contentType", type: "text", max: 255 },
      { name: "sourceIp", type: "text", max: 255 },
      { name: "validationStatus", type: "select", required: true, maxSelect: 1, values: ["valid", "invalid", "not_configured", "not_applicable"] },
      { name: "processingStatus", type: "select", required: true, maxSelect: 1, values: ["processed", "ignored", "rejected", "failed"] },
      { name: "eventType", type: "text", max: 160 },
      { name: "providerEventId", type: "text", max: 500 },
      { name: "providerMessageId", type: "text", max: 500 },
      { name: "responseStatus", type: "number", required: true, onlyInt: true, min: 100, max: 599 },
      { name: "durationMs", type: "number", required: true, onlyInt: true, min: 0 },
      { name: "requestHeaders", type: "json", maxSize: 1000000 },
      { name: "payload", type: "json", maxSize: 1000000 },
      { name: "rawBody", type: "text", max: 1000000 },
      { name: "responseHeaders", type: "json", maxSize: 1000000 },
      { name: "responseBody", type: "text", max: 1000000 },
      { name: "errorMessage", type: "text", max: 10000 },
      { name: "searchText", type: "text", max: 50000 },
      { name: "receivedAt", type: "date", required: true },
      { name: "expiresAt", type: "date", required: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_webhook_logs_request ON webhook_logs (requestId)",
      "CREATE INDEX idx_webhook_logs_received ON webhook_logs (receivedAt DESC)",
      "CREATE INDEX idx_webhook_logs_provider_received ON webhook_logs (provider, receivedAt DESC)",
      "CREATE INDEX idx_webhook_logs_status_received ON webhook_logs (processingStatus, receivedAt DESC)",
      "CREATE INDEX idx_webhook_logs_event_received ON webhook_logs (eventType, receivedAt DESC)",
      "CREATE INDEX idx_webhook_logs_expiry ON webhook_logs (expiresAt)",
    ],
  });
  app.save(logs);
}, (app) => {
  const logs = app.findCollectionByNameOrId("webhook_logs");
  if (logs) app.delete(logs);
});
