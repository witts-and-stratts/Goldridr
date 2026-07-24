migrate((app) => {
  const deliveries = app.findCollectionByNameOrId("notification_deliveries");
  deliveries.fields.add(new DateField({ name: "readAt" }));
  app.save(deliveries);
}, (app) => {
  const deliveries = app.findCollectionByNameOrId("notification_deliveries");
  deliveries.fields.removeByName("readAt");
  app.save(deliveries);
});
