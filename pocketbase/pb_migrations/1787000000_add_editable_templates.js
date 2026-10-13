migrate((app) => {
  const templates = new Collection({
    type: "base",
    name: "templates",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      { name: "channel", type: "select", required: true, maxSelect: 1, values: ["email", "sms", "pdf"] },
      { name: "templateId", type: "text", required: true, max: 160 },
      { name: "enabled", type: "bool" },
      { name: "currentRevision", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "content", type: "json", required: true, maxSize: 200000 },
      { name: "updatedBy", type: "text", max: 200 },
      { name: "sourceUpdatedAt", type: "date" },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_templates_channel_id ON templates (channel, templateId)",
      "CREATE INDEX idx_templates_channel ON templates (channel)",
    ],
  });
  app.save(templates);

  const revisions = new Collection({
    type: "base",
    name: "template_revisions",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: "created", type: "autodate", onCreate: true },
      { name: "channel", type: "select", required: true, maxSelect: 1, values: ["email", "sms", "pdf"] },
      { name: "templateId", type: "text", required: true, max: 160 },
      { name: "revision", type: "number", required: true, onlyInt: true, min: 1 },
      { name: "action", type: "select", required: true, maxSelect: 1, values: ["created", "updated", "enabled", "disabled", "reset", "reverted"] },
      { name: "previousContent", type: "json", maxSize: 200000 },
      { name: "content", type: "json", maxSize: 200000 },
      { name: "createdBy", type: "text", max: 200 },
      { name: "note", type: "text", max: 500 },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_template_revisions_identity ON template_revisions (channel, templateId, revision)",
      "CREATE INDEX idx_template_revisions_lookup ON template_revisions (channel, templateId, revision DESC)",
    ],
  });
  app.save(revisions);

  const deliveries = app.findCollectionByNameOrId("notification_deliveries");
  deliveries.fields.add(new TextField({ name: "templateVariant", max: 80 }));
  deliveries.fields.add(new NumberField({ name: "templateRevision", onlyInt: true, min: 0 }));
  deliveries.fields.add(new SelectField({ name: "templateSource", maxSelect: 1, values: ["default", "override"] }));
  deliveries.fields.add(new JSONField({ name: "templateSnapshot", maxSize: 200000 }));
  app.save(deliveries);
}, (app) => {
  const deliveries = app.findCollectionByNameOrId("notification_deliveries");
  for (const name of ["templateVariant", "templateRevision", "templateSource", "templateSnapshot"]) {
    deliveries.fields.removeByName(name);
  }
  app.save(deliveries);

  for (const name of ["template_revisions", "templates"]) {
    const collection = app.findCollectionByNameOrId(name);
    if (collection) app.delete(collection);
  }
});
