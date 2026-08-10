import type { FlightDirection } from "@/lib/flights/types";

export const HOUSTON_AIRPORTS = [
  {
    code: "IAH",
    name: "George Bush Intercontinental Airport (IAH)",
    description: "The primary international airport serving the Greater Houston area.",
    type: "International Hub",
  },
  {
    code: "HOU",
    name: "William P. Hobby Airport (HOU)",
    description: "Houston's oldest commercial airport, a key hub for domestic flights.",
    type: "Domestic Hub",
  },
  {
    code: "EFD",
    name: "Ellington Airport (EFD)",
    description: "Serving the US military, NASA, and general aviation.",
    type: "Military / Space",
  },
  {
    code: "DWH",
    name: "David Wayne Hooks Memorial Airport (DWH)",
    description: "One of the largest private airports in the US, specializing in charter flights.",
    type: "Private / Charter",
  },
  {
    code: "SGR",
    name: "Sugar Land Regional Airport (SGR)",
    description: "A popular choice for corporate aviation in the southwest Houston area.",
    type: "Corporate / Executive",
  },
] as const;

const HOUSTON_AIRPORT_CODES = new Set<string>(
  HOUSTON_AIRPORTS.map((airport) => airport.code),
);

export function isHoustonAirport(iata: string | null | undefined): boolean {
  return HOUSTON_AIRPORT_CODES.has(iata?.trim().toUpperCase() || "");
}

export function inferHoustonAirportDirection(
  origin: string | null | undefined,
  destination: string | null | undefined,
): FlightDirection | null {
  const originIsLocal = isHoustonAirport(origin);
  const destinationIsLocal = isHoustonAirport(destination);

  if (destinationIsLocal && !originIsLocal) return "from_airport";
  if (originIsLocal && !destinationIsLocal) return "to_airport";
  return null;
}

export function resolveHoustonAirportDirection(
  manualDirection: FlightDirection | null,
  origin: string | null | undefined,
  destination: string | null | undefined,
): FlightDirection | null {
  return manualDirection ?? inferHoustonAirportDirection(origin, destination);
}
