import assert from "node:assert/strict";
import test from "node:test";
import {
  HOUSTON_AIRPORTS,
  inferHoustonAirportDirection,
  isHoustonAirport,
  resolveHoustonAirportDirection,
} from "../src/lib/airports";

test("Houston airport coverage has unique inferable codes", () => {
  const codes = HOUSTON_AIRPORTS.map((airport) => airport.code);
  assert.deepEqual(codes, ["IAH", "HOU", "EFD", "DWH", "SGR"]);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(isHoustonAirport(" iah "), true);
});

test("an arrival at a Houston airport infers airport pickup", () => {
  for (const airport of HOUSTON_AIRPORTS) {
    assert.equal(
      inferHoustonAirportDirection("ORD", airport.code),
      "from_airport",
    );
  }
});

test("a departure from a Houston airport infers airport drop-off", () => {
  for (const airport of HOUSTON_AIRPORTS) {
    assert.equal(
      inferHoustonAirportDirection(airport.code, "DAL"),
      "to_airport",
    );
  }
});

test("ambiguous routes do not infer a direction", () => {
  assert.equal(inferHoustonAirportDirection("IAH", "HOU"), null);
  assert.equal(inferHoustonAirportDirection("ORD", "JFK"), null);
  assert.equal(inferHoustonAirportDirection(null, undefined), null);
});

test("an explicit direction takes precedence over route inference", () => {
  assert.equal(
    resolveHoustonAirportDirection("to_airport", "ORD", "IAH"),
    "to_airport",
  );
  assert.equal(
    resolveHoustonAirportDirection("from_airport", "HOU", "DAL"),
    "from_airport",
  );
});
