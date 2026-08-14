migrate((app) => {
  try {
    app.findCollectionByNameOrId("app_settings");
    return;
  } catch {}

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
}, () => {});
