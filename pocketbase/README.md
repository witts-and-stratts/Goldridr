# Goldridr PocketBase service

Goldridr uses PocketBase as a staged backend so authentication and notifications can move without interrupting the existing booking, payment, email, SMS, and Expo Push workflows.

## Docker Compose

Build and start PocketBase from the repository root:

```sh
docker compose up -d --build pocketbase
docker compose ps
```

PocketBase is available at `http://127.0.0.1:8090` by default. Set `POCKETBASE_PORT` to change the host port. The `pocketbase_data` named volume persists the database and uploaded files, while committed migrations are mounted read-only and applied at startup.

Create the first superuser after the container is healthy:

```sh
docker compose exec pocketbase pocketbase superuser create EMAIL PASSWORD --dir=/pb/pb_data
```

Back up the named volume before upgrades. `docker compose down` preserves it; `docker compose down -v` permanently deletes it.

## Local service

1. Download PocketBase 0.35 for the host architecture from the official releases page.
2. Place the executable at `pocketbase/pocketbase`.
3. From the `pocketbase` directory, create the first superuser:

   ```sh
   ./pocketbase superuser create EMAIL PASSWORD
   ```

4. Start the service from this directory so `pb_migrations` is discovered:

   ```sh
   ./pocketbase serve --http=127.0.0.1:8090
   ```

5. Create a superuser API key in the PocketBase dashboard and set `POCKETBASE_SUPERUSER_TOKEN`. Do not expose this value through a `NEXT_PUBLIC_` variable.

The `pb_data` directory and local executable are ignored. The JavaScript migrations are committed and applied automatically when PocketBase starts.

## Initial data migration

Keep all PocketBase flags disabled, start PocketBase, then run:

```sh
npm run pocketbase:migrate
npm run pocketbase:status
npm run pocketbase:verify
```

The importer is idempotent. It creates the admin and chauffeur auth records, preserving `legacyUserId` values used by the existing APIs. It reports and skips orphan child records whose parent notification no longer exists. New chauffeur records receive `CHAUFFEUR_DEFAULT_PASSWORD`; users should change that temporary password after cutover. The verifier performs a live health, auth-collection, notification CRUD, read-state, and realtime subscription check and removes its temporary records.

## Core data synchronization

Set `POCKETBASE_CORE_WRITE=true` and restart the web app and worker. SQLite triggers write committed changes for bookings, chauffeurs, vehicles, payments, discounts, blocked slots, settings, and SMS consent records to `pocketbase_core_outbox`. The worker applies them to PocketBase with retry backoff. Verify `pendingCoreOutbox` returns to zero before enabling PocketBase reads for a domain.

## Notification cutover

Change one flag at a time:

1. Set `POCKETBASE_NOTIFICATIONS_WRITE=true` and restart the web app and notification worker.
2. Create a test booking and verify the worker drains `pendingOutbox` to zero with `npm run pocketbase:status`.
3. Run `npm run pocketbase:migrate` again to capture read state and preferences changed during validation.
4. Set `POCKETBASE_NOTIFICATIONS_READ=true` and restart the web app.
5. Verify the realtime inbox, unread count, mark read/unread, and delete behavior.
6. Set `POCKETBASE_DELIVERY_QUEUE=true` and restart the worker. PocketBase now supplies delivery claims while SQLite remains a synchronized rollback shadow.
7. Verify email, SMS, Expo Push, reminders, retries, dead-letter alerts, and provider webhooks.

SQLite remains the transactional notification source during this stage. Committed notification graphs are mirrored through `pocketbase_notification_outbox`; PocketBase failures cannot roll back booking creation.

## Authentication cutover

After the importer has created and verified all `app_users` records, set `POCKETBASE_AUTH=true`. Goldridr will validate credentials with PocketBase while retaining its existing HTTP-only session cookie and mobile bearer token, so protected routes do not change all at once.

Rollback only requires disabling the relevant flag and restarting the processes. Do not delete SQLite data during the staged migration.

## Production

- Bind PocketBase to loopback and expose it through the existing TLS reverse proxy.
- Persist and back up `pocketbase/pb_data` separately from the application release.
- Run PocketBase, Next.js, and `npm run notifications:worker` as independently supervised services.
- Schedule PocketBase backups and continue backing up `bookings.db` until the final source-of-truth cutover is complete.
- Use `npm run pocketbase:backup` from the host scheduler and monitor `/api/health` for both SQLite and PocketBase readiness.
