# GoldRidrPocketBase service

PocketBase is Goldridr's sole application data store for authentication, bookings, operations, notifications, and delivery state.

Start the local service from the repository root:

```sh
docker compose up -d --build pocketbase
docker compose exec pocketbase pocketbase superuser create EMAIL PASSWORD --dir=/pb/pb_data
```

Set `POCKETBASE_URL` and the server-only `POCKETBASE_SUPERUSER_EMAIL`/`POCKETBASE_SUPERUSER_PASSWORD` for the web app and notification worker. The committed migrations are applied automatically on startup. Back up the persistent `pb_data` volume before upgrades; do not use `docker compose down -v` unless intentionally destroying all application data.

Run `npm run pocketbase:verify` to check connectivity and the required collections. Run `npm run pocketbase:backup` from the host scheduler to create backups.
