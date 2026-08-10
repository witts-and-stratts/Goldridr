migrate((app) => {
  const events = app.findCollectionByNameOrId("flight_provider_events");
  const fields = ["success", "durationMs"].map((name) => {
    const field = events.fields.getByName(name);
    return { ...JSON.parse(JSON.stringify(field)), type: field.type(), required: false };
  });
  for (const field of fields) events.fields.addMarshaledJSON(JSON.stringify(field));
  app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("flight_provider_events");
  const fields = ["success", "durationMs"].map((name) => {
    const field = events.fields.getByName(name);
    return { ...JSON.parse(JSON.stringify(field)), type: field.type(), required: true };
  });
  for (const field of fields) events.fields.addMarshaledJSON(JSON.stringify(field));
  app.save(events);
});
