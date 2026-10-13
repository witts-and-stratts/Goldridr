/// <reference path="../pb_data/types.d.ts" />

// Round trips used to be two linked bookings. They now live on one booking: the
// booking's own schedule fields are the outbound leg and the return* fields hold
// the return leg. Each leg can carry its own status so one leg can be cancelled,
// refunded or completed while the other stays active; an empty leg status means
// the leg follows the booking status.
const RETURN_SUFFIX = "-R";

function jsonValue(record, name) {
  const raw = record.getString(name);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

migrate((app) => {
  const bookings = app.findCollectionByNameOrId("bookings");
  const chauffeurs = app.findCollectionByNameOrId("chauffeurs");
  bookings.fields.add(new TextField({ name: "outboundLegStatus", max: 80 }));
  bookings.fields.add(new TextField({ name: "returnDate", max: 40 }));
  bookings.fields.add(new TextField({ name: "returnTime", max: 40 }));
  bookings.fields.add(new NumberField({ name: "returnDuration", onlyInt: true, min: 0 }));
  bookings.fields.add(new RelationField({ name: "returnChauffeur", maxSelect: 1, collectionId: chauffeurs.id, cascadeDelete: false }));
  bookings.fields.add(new JSONField({ name: "returnTripDetails", maxSize: 1000000 }));
  bookings.fields.add(new TextField({ name: "returnLegStatus", max: 80 }));
  bookings.fields.add(new DateField({ name: "returnPinConfirmedAt" }));
  bookings.indexes.push("CREATE INDEX idx_bookings_return_pickup ON bookings (returnDate, returnTime)");
  bookings.indexes.push("CREATE INDEX idx_bookings_return_chauffeur ON bookings (returnChauffeur, returnDate)");
  app.save(bookings);

  const payments = app.findCollectionByNameOrId("payments");
  payments.fields.add(new NumberField({ name: "refundedCents", onlyInt: true, min: 0 }));
  payments.fields.add(new JSONField({ name: "refunds", maxSize: 200000 }));
  app.save(payments);

  const tracking = app.findCollectionByNameOrId("flight_tracking");
  tracking.fields.add(new TextField({ name: "leg", max: 20 }));
  tracking.indexes = tracking.indexes
    .filter((index) => !index.includes("idx_flight_tracking_booking"))
    .concat(["CREATE UNIQUE INDEX idx_flight_tracking_booking_leg ON flight_tracking (booking, leg)"]);
  app.save(tracking);

  for (const row of app.findRecordsByFilter("flight_tracking", "leg = ''", "", 0, 0)) {
    row.set("leg", "outbound");
    app.save(row);
  }

  for (const row of app.findRecordsByFilter("payments", "status = 'refunded'", "", 0, 0)) {
    row.set("refundedCents", row.getInt("amountCents"));
    app.save(row);
  }

  // Fold each legacy return booking into its outbound booking.
  for (const outbound of app.findRecordsByFilter("bookings", "tripDetails ~ '\"leg\":\"outbound\"'", "", 0, 0)) {
    const details = jsonValue(outbound, "tripDetails");
    const link = details.roundTrip;
    if (!link || link.leg !== "outbound" || !link.pairedReference) continue;
    const reference = outbound.getString("reference");
    let ret;
    try {
      ret = app.findFirstRecordByFilter("bookings", "reference = {:reference}", { reference: link.pairedReference });
    } catch (_) {
      ret = null;
    }

    const legacyReturnReference = link.pairedReference;
    details.roundTrip = { ...link, pairedReference: reference + RETURN_SUFFIX };
    outbound.set("tripDetails", details);

    if (ret) {
      const returnDetails = jsonValue(ret, "tripDetails");
      delete returnDetails.estimatedPrice;
      returnDetails.roundTrip = { leg: "return", pairedReference: reference };
      outbound.set("returnDate", ret.getString("pickupDate"));
      outbound.set("returnTime", ret.getString("pickupTime"));
      outbound.set("returnDuration", ret.getInt("duration"));
      outbound.set("returnChauffeur", ret.getString("chauffeur"));
      outbound.set("returnTripDetails", returnDetails);
      outbound.set("returnPinConfirmedAt", ret.getString("pinConfirmedAt"));
      const returnStatus = ret.getString("status");
      outbound.set("returnLegStatus", returnStatus === outbound.getString("status") ? "" : returnStatus);
    }
    app.save(outbound);

    if (!ret) continue;
    for (const row of app.findRecordsByFilter("flight_tracking", "booking = {:booking}", "", 0, 0, { booking: ret.id })) {
      row.set("booking", outbound.id);
      row.set("leg", "return");
      app.save(row);
    }
    for (const row of app.findRecordsByFilter("notifications", "bookingReference = {:reference}", "", 0, 0, { reference: legacyReturnReference })) {
      row.set("bookingReference", reference);
      app.save(row);
    }
    app.delete(ret);
  }
}, (app) => {
  const tracking = app.findCollectionByNameOrId("flight_tracking");
  for (const row of app.findRecordsByFilter("flight_tracking", "leg = 'return'", "", 0, 0)) app.delete(row);
  tracking.fields.removeByName("leg");
  tracking.indexes = tracking.indexes
    .filter((index) => !index.includes("idx_flight_tracking_booking_leg"))
    .concat(["CREATE UNIQUE INDEX idx_flight_tracking_booking ON flight_tracking (booking)"]);
  app.save(tracking);

  const payments = app.findCollectionByNameOrId("payments");
  for (const name of ["refundedCents", "refunds"]) payments.fields.removeByName(name);
  app.save(payments);

  // Return legs are not split back into separate bookings; rolling back drops them.
  const bookings = app.findCollectionByNameOrId("bookings");
  for (const name of ["outboundLegStatus", "returnDate", "returnTime", "returnDuration", "returnChauffeur", "returnTripDetails", "returnLegStatus", "returnPinConfirmedAt"]) bookings.fields.removeByName(name);
  bookings.indexes = bookings.indexes.filter((index) => !index.includes("idx_bookings_return_pickup") && !index.includes("idx_bookings_return_chauffeur"));
  app.save(bookings);
});
