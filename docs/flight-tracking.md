# Flight tracking

Goldridr stores normalized flight snapshots in PocketBase and never calls a paid provider from `GET /api/flights`. The booking form performs a lookup only when the customer presses **Look up flight details**. A lookup is optional and does not block manual flight-number or terminal entry.

## Provider modes

- `GET /api/flights?flight_iata=UA1476&flight_date=2026-08-09&direction=from_airport` reads a fresh cache entry or an approved primary provider.
- `POST /api/flights` accepts `{ flightIata, flightDate, direction }` and may use the manual licensed provider after a cache miss.
- Aviationstack is dormant unless both `FLIGHT_AVIATIONSTACK_ENABLED=true` and `AVIATIONSTACK_API_KEY` are present. Manual paid calls are capped by `FLIGHT_MANUAL_MAX_PER_HOUR`.
- `getPrimaryFlightProvider()` deliberately returns no provider. Add a site-specific implementation only after the permission checklist below is complete.

## Permission checklist

Before registering a scraper with `definePermissionedScrapeProvider`, retain:

1. The data owner's written commercial automation permission and its effective date.
2. The permitted fields, request frequency, identification requirements, and retention limits.
3. Saved HTML/JSON fixtures that exercise successful, missing, delayed, cancelled, diverted, and blocked responses.
4. Backoff behavior for `403`, `429`, bot challenges, and unexpected markup.

Do not treat `robots.txt` as commercial permission. Do not enable a parser when its permission reference or minimum interval is absent.

## Worker and operations

`npm run flights:worker` discovers active airport bookings and updates `flight_tracking`. Production runs it as `flight-tracking-worker`. It polls every 15 minutes from six hours before the relevant flight time, every five minutes from two hours before, and stops at a terminal status or two hours after the relevant time.

Material changes create an admin notification and a push notification for the assigned chauffeur. Alerts cover cancellation, diversion, terminal/gate changes, and cumulative arrival movement of at least 15 minutes. Provider and cache metrics are recorded in `flight_provider_events`.

Apply `pocketbase/pb_migrations/1786204800_create_flight_tracking.js` before starting the worker.
