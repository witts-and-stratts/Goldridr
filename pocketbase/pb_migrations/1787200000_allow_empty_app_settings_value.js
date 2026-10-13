migrate((app) => {
  const settings = app.findCollectionByNameOrId("app_settings");
  settings.fields.getByName("value").required = false;
  app.save(settings);
}, (app) => {
  const settings = app.findCollectionByNameOrId("app_settings");
  settings.fields.getByName("value").required = true;
  app.save(settings);
});
