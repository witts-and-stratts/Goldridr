# Hetzner deployment

The production workflow tests the app, builds it explicitly with Turbopack, publishes immutable Next.js, PocketBase, and notification-worker images to GitHub Container Registry, then deploys those exact images over SSH. A failed container health check automatically restores the previous release.

## One-time server setup

Install Docker Engine with the Compose plugin and prepare the deployment directory while logged in as `root`:

```bash
mkdir -p /root/goldridr/data /root/goldridr/.next-cache /root/goldridr/pocketbase-data /root/goldridr/scripts
chown -R 1001:1001 /root/goldridr/data /root/goldridr/.next-cache
chown -R 1000:1000 /root/goldridr/pocketbase-data
```

Copy `compose.production.yaml` and `scripts/deploy.sh` to the server once. From a trusted computer in the repository root:

```bash
scp compose.production.yaml root@YOUR_HETZNER_IP:/root/goldridr/compose.production.yaml
scp scripts/deploy.sh root@YOUR_HETZNER_IP:/root/goldridr/scripts/deploy.sh
ssh root@YOUR_HETZNER_IP 'chmod 700 /root/goldridr/scripts/deploy.sh'
```

The GitHub workflow does not upload or overwrite these server-owned files. During deployment it authenticates the server to GHCR and invokes `/root/goldridr/scripts/deploy.sh`; that script runs `docker compose pull` and `docker compose up` directly on Hetzner. When the service layout changes, update the server copies before deploying the corresponding application release.

Each successful pipeline deployment writes its immutable web, PocketBase, and worker image references into `/root/goldridr/.env`. PocketBase and worker images are rebuilt and redeployed only when their respective Dockerfile, migrations, or worker source inputs change; otherwise the deployment script retains their previously deployed image references. This allows normal server-side operation without exporting pipeline variables:

```bash
cd /root/goldridr
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d --wait
```

Before the first pipeline deployment, the Compose file falls back to the three `latest` GHCR tags. If the packages are private, run `docker login ghcr.io` once as `root` before pulling them.

Create `/root/goldridr/.env` directly on the server. Start from `.env.example`, use production values, and never commit this file. At minimum set `AUTH_SECRET`, PocketBase credentials, the public base URL, and the notification provider configuration. Set `POCKETBASE_URL=http://pocketbase:8090`; the deployment script rejects any other value. `POCKETBASE_HOST_PORT` is optional and defaults to `8091`.

The Next.js cache is under `/root/goldridr/.next-cache` and PocketBase data is under `/root/goldridr/pocketbase-data`. The containers communicate through `http://pocketbase:8090`. PocketBase is available to host-side administration tools at `127.0.0.1:8091` but is not publicly exposed. The worker runs `npm run notifications:worker`, uses the same `.env`, restarts automatically, and receives 30 seconds to stop cleanly during releases.

Setting `POCKETBASE_SUPERUSER_EMAIL` and `POCKETBASE_SUPERUSER_PASSWORD` configures application authentication; it does not create a PocketBase account. Provision a superuser in the mounted database and set these variables to that account's credentials.

## PocketBase deployment failures

An unhealthy notification worker with `Failed to authenticate` (HTTP 400) means superuser authentication failed. Check the server's `.env` credentials against the superuser in the mounted production database. Also check any configured superuser IP restrictions. `Missing collection context` (HTTP 404) means a requested collection could not be resolved; the log alone does not identify which collection. Check the database mount and the migrations bundled in the selected PocketBase image.

The deployment starts PocketBase and runs `pocketbase:verify` before rolling out the new web and notification worker containers. Verification authenticates, checks the required notification collections, and exercises persistence and realtime. A failure reports the authentication step or collection name without printing credentials.

On the server, diagnose the currently selected release with:

```bash
cd /root/goldridr
docker compose -f compose.production.yaml ps
docker inspect "$(docker compose -f compose.production.yaml ps -q pocketbase)" --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
docker compose -f compose.production.yaml exec pocketbase ls /pb/pb_migrations
docker compose -f compose.production.yaml run --rm --no-deps notifications-worker npm run pocketbase:verify
```

The data mount must point from `/root/goldridr/pocketbase-data` to `/pb/pb_data`. If it points to a fresh or incorrect directory, restore the intended mount. For missing migrations, deploy an image containing the repository's migration files. PocketBase applies unapplied migrations automatically on startup. If the correct files are present, take a database backup, then apply any pending migrations explicitly:

```bash
docker compose -f compose.production.yaml exec pocketbase pocketbase migrate up --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations
```

Do not delete the production data directory or reset migration history to address this error. If migrations are marked applied but collections are missing, investigate schema drift and restore or repair the affected schema.

After repairing credentials or schema, rerun verification before retrying the pipeline. A rolled-back release uses its previous images, so verification against that release does not establish that the failed candidate is ready. The next pipeline run checks the candidate worker image against the selected PocketBase image.

Upload the updated `scripts/deploy.sh` to the server before using the new startup order; the GitHub workflow does not sync it. The verification script is bundled into the rebuilt worker image.

## GitHub production environment

Create a GitHub environment named `production`. Add these environment secrets:

- `HETZNER_HOST`: server hostname or IP address
- `HETZNER_USER`: `root`
- `HETZNER_SSH_PRIVATE_KEY`: private key dedicated to GitHub Actions
- `HETZNER_SSH_KEY_PASSPHRASE`: passphrase for the encrypted private key
- `HETZNER_SSH_KNOWN_HOSTS`: verified `known_hosts` entry for the server

Add these repository variables (the image build needs them before the deployment job enters the environment):

- `NEXT_PUBLIC_BASE_URL`: public HTTPS URL, such as `https://goldridr.com`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: browser-restricted Google Maps key
- `HETZNER_SSH_PORT`: optional, defaults to `22`
- `HETZNER_DEPLOY_PATH`: optional, defaults to `/root/goldridr`

`NEXT_PUBLIC_*` values are embedded during the image build. Server-only values stay exclusively in `/root/goldridr/.env`.

Protect the `production` environment with required reviewers if deployments need manual approval. Pull requests run the automated tests and production image build; pushes to `main` and manual workflow runs additionally publish and deploy that image.

## Traefik and TLS

Production uses the existing Traefik instance as its reverse proxy and TLS terminator. The web container joins the external `weboverlay` network and the stack's default network. Traefik routes `goldridr.com` and `www.goldridr.com` through its `websecure` entrypoint using the `letsencrypt` certificate resolver to the web container's HTTP port `3000`. The app does not publish a host port. PocketBase and workers stay on the default network and have Traefik discovery disabled.

The `weboverlay` network must already exist and the Traefik container must be attached to it. If this is a Swarm overlay network, it must allow standalone containers to attach because this pipeline uses Docker Compose. Both domain names must resolve to the Traefik server. Traefik must already define the `websecure` entrypoint and `letsencrypt` resolver; labels reference these settings but do not create them. Keep HTTP-to-HTTPS redirection in the existing Traefik configuration.

Nginx is unnecessary for this setup. Upload both updated server files before the next deployment; deployment and rollback now reference only the application services. The deployment's `--remove-orphans` removes the old Compose Nginx container when applying the updated stack. The existing Nginx configuration file is no longer used by production.
