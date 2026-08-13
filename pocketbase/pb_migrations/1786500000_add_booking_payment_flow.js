migrate((app) => {
  const bookings = app.findCollectionByNameOrId("bookings");
  bookings.fields.add(new TextField({ name: "paymentTokenHash", max: 128, hidden: true }));
  bookings.fields.add(new DateField({ name: "holdExpiresAt" }));
  bookings.fields.add(new NumberField({ name: "quoteSubtotalCents", onlyInt: true, min: 0 }));
  bookings.fields.add(new NumberField({ name: "quoteDiscountCents", onlyInt: true, min: 0 }));
  bookings.fields.add(new NumberField({ name: "quoteTotalCents", onlyInt: true, min: 0 }));
  bookings.fields.add(new TextField({ name: "quoteCurrency", max: 12 }));
  bookings.fields.add(new DateField({ name: "paymentConfirmedAt" }));
  bookings.indexes.push("CREATE INDEX idx_bookings_payment_token ON bookings (paymentTokenHash)");
  bookings.indexes.push("CREATE INDEX idx_bookings_hold_expiry ON bookings (status, holdExpiresAt)");
  app.save(bookings);

  const payments = app.findCollectionByNameOrId("payments");
  payments.fields.add(new TextField({ name: "provider", max: 40 }));
  payments.fields.add(new TextField({ name: "externalId", max: 500 }));
  payments.fields.add(new TextField({ name: "idempotencyKey", max: 160 }));
  payments.fields.add(new TextField({ name: "failureCode", max: 160 }));
  payments.fields.add(new TextField({ name: "failureMessage", max: 2000 }));
  payments.fields.add(new DateField({ name: "refundedAt" }));
  payments.fields.add(new TextField({ name: "senderName", max: 200 }));
  payments.fields.add(new TextField({ name: "confirmationReference", max: 255 }));
  payments.fields.add(new DateField({ name: "verificationExpiresAt" }));
  payments.fields.add(new JSONField({ name: "providerMetadata", maxSize: 1000000 }));
  payments.indexes.push("CREATE INDEX idx_payments_provider_external ON payments (provider, externalId)");
  payments.indexes.push("CREATE INDEX idx_payments_idempotency ON payments (idempotencyKey)");
  app.save(payments);

  const logs = app.findCollectionByNameOrId("webhook_logs");
  const provider = logs.fields.getByName("provider");
  const marshaled = { ...JSON.parse(JSON.stringify(provider)), type: provider.type(), values: ["twilio", "resend", "ses", "stripe", "square", "paypal"] };
  logs.fields.addMarshaledJSON(JSON.stringify(marshaled));
  app.save(logs);
}, (app) => {
  const logs = app.findCollectionByNameOrId("webhook_logs");
  const provider = logs.fields.getByName("provider");
  const marshaled = { ...JSON.parse(JSON.stringify(provider)), type: provider.type(), values: ["twilio", "resend", "ses"] };
  logs.fields.addMarshaledJSON(JSON.stringify(marshaled));
  app.save(logs);

  const payments = app.findCollectionByNameOrId("payments");
  for (const name of ["provider", "externalId", "idempotencyKey", "failureCode", "failureMessage", "refundedAt", "senderName", "confirmationReference", "verificationExpiresAt", "providerMetadata"]) payments.fields.removeByName(name);
  payments.indexes = payments.indexes.filter((index) => !index.includes("idx_payments_provider_external") && !index.includes("idx_payments_idempotency"));
  app.save(payments);

  const bookings = app.findCollectionByNameOrId("bookings");
  for (const name of ["paymentTokenHash", "holdExpiresAt", "quoteSubtotalCents", "quoteDiscountCents", "quoteTotalCents", "quoteCurrency", "paymentConfirmedAt"]) bookings.fields.removeByName(name);
  bookings.indexes = bookings.indexes.filter((index) => !index.includes("idx_bookings_payment_token") && !index.includes("idx_bookings_hold_expiry"));
  app.save(bookings);
});
