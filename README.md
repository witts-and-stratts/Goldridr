# Goldridr Driver

Expo app for Goldridr chauffeurs: see assigned rides, update ride status, and
scan a rider's **Ride Pass** QR code to pull up trip details at pickup.

## How it fits together

- The app talks to the Goldridr Next.js server via the `/api/driver/*` routes
  (bearer-token auth, signed with the same `AUTH_SECRET` as the web session).
- Riders get their Ride Pass on the website's **Verify Booking** page
  (`/verify`). The QR encodes `…/verify?reference=<ref>&email=<email>`, so it
  also opens the booking page when scanned with a regular camera app.
- Chauffeur accounts (email + password) are created from the admin dashboard.

## Running it

1. Start the Goldridr server in the repo root (`npm run dev`). Make sure
   `AUTH_SECRET` is set in `.env.local`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`. On a physical
   device this must be your machine's LAN IP, e.g. `http://192.168.1.20:3000`.
3. `npm install && npx expo start`, then open in Expo Go or a dev build.
   Camera scanning requires a real device (no camera in the simulator).

## Screens

| Route | Purpose |
|---|---|
| `login` | Chauffeur sign-in; token kept in SecureStore |
| `(tabs)/index` | Assigned rides, pull-to-refresh |
| `(tabs)/schedule` | Calendar with day/week/month/year/agenda views, block time off |
| `(tabs)/scan` | QR scanner — looks up the rider's booking |
| `ride/[reference]` | Trip details, Confirm / Complete actions |
