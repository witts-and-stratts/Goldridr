# Flight tracking

GoldRidrstores normalized Aviationstack flight snapshots in PocketBase. The booking form performs a lookup when the customer presses **Look up flight details**. A lookup is optional and does not block manual flight-number or terminal entry.

## Provider modes

- `GET /api/flights?flight_iata=UA1476` reads a fresh cache entry or queries the configured primary provider. `flight_date` and `direction` are optional refinements.
- `POST /api/flights` accepts `{ flightIata }`, with optional `flightDate` and `direction`, and may use the manual licensed provider after a cache miss.
- Aviationstack is the default primary provider and is available when `AVIATIONSTACK_API_KEY` is present. Set `FLIGHT_PRIMARY_PROVIDER=none` to disable automatic provider calls.
- `FLIGHT_AVIATIONSTACK_ENABLED=true` retains Aviationstack as a manual fallback when another primary provider is selected. Manual paid calls are capped by `FLIGHT_MANUAL_MAX_PER_HOUR`.

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
