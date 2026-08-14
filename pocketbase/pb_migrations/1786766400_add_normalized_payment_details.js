migrate((app) => {
  const payments = app.findCollectionByNameOrId("payments");
  payments.fields.add(new TextField({ name: "cardLast4", max: 4 }));
  payments.fields.add(new TextField({ name: "cardBrand", max: 80 }));
  payments.fields.add(new NumberField({ name: "cardExpiryMonth", onlyInt: true, min: 1, max: 12 }));
  payments.fields.add(new NumberField({ name: "cardExpiryYear", onlyInt: true, min: 2000, max: 9999 }));
  payments.fields.add(new TextField({ name: "walletType", max: 80 }));
  payments.fields.add(new TextField({ name: "receiptUrl", max: 2000 }));
  app.save(payments);
}, (app) => {
  const payments = app.findCollectionByNameOrId("payments");
  for (const name of ["cardLast4", "cardBrand", "cardExpiryMonth", "cardExpiryYear", "walletType", "receiptUrl"]) payments.fields.removeByName(name);
  app.save(payments);
});
