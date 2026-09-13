migrate((app) => {
  const logs = app.findCollectionByNameOrId("webhook_logs");
  const provider = logs.fields.getByName("provider");
  const marshaled = { ...JSON.parse(JSON.stringify(provider)), type: provider.type(), values: ["twilio", "resend", "ses", "stripe", "paypal"] };
  logs.fields.addMarshaledJSON(JSON.stringify(marshaled));
  app.save(logs);
}, (app) => {
  const logs = app.findCollectionByNameOrId("webhook_logs");
  const provider = logs.fields.getByName("provider");
  const marshaled = { ...JSON.parse(JSON.stringify(provider)), type: provider.type(), values: ["twilio", "resend", "ses", "stripe", "square", "paypal"] };
  logs.fields.addMarshaledJSON(JSON.stringify(marshaled));
  app.save(logs);
});
