migrate((app) => {
  const consents = app.findCollectionByNameOrId("sms_consents");
  consents.fields.add(new TextField({ name: "campaignType", max: 40 }));
  consents.fields.add(new TextField({ name: "consentSource", max: 120 }));
  consents.fields.add(new TextField({ name: "consentText", max: 4000 }));
  consents.fields.add(new TextField({ name: "ipAddress", max: 120 }));
  consents.fields.add(new TextField({ name: "userAgent", max: 1000 }));
  app.save(consents);
}, (app) => {
  const consents = app.findCollectionByNameOrId("sms_consents");
  consents.fields.removeByName("campaignType");
  consents.fields.removeByName("consentSource");
  consents.fields.removeByName("consentText");
  consents.fields.removeByName("ipAddress");
  consents.fields.removeByName("userAgent");
  app.save(consents);
});
