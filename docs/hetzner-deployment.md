# Hetzner deployment

The production workflow tests the app, builds it explicitly with Turbopack, publishes immutable Next.js, PocketBase, and notification-worker images to GitHub Container Registry, then deploys those exact images over SSH. A failed container health check automatically restores the previous release.

## One-time server setup

Install Docker Engine with the Compose plugin and prepare the deployment directory while logged in as `root`:

```bash
mkdir -p /root/goldridr/data /root/goldridr/.next-cache /root/goldridr/pocketbase-data /root/goldridr/scripts /root/goldridr/nginx
chown -R 1001:1001 /root/goldridr/data /root/goldridr/.next-cache
chown -R 1000:1000 /root/goldridr/pocketbase-data
```

Copy `compose.production.yaml`, `scripts/deploy.sh`, and the Nginx configuration to the server once. From a trusted computer in the repository root:

```bash
scp compose.production.yaml root@YOUR_HETZNER_IP:/root/goldridr/compose.production.yaml
scp scripts/deploy.sh root@YOUR_HETZNER_IP:/root/goldridr/scripts/deploy.sh
scp nginx/nginx.conf root@YOUR_HETZNER_IP:/root/goldridr/nginx/nginx.conf
ssh root@YOUR_HETZNER_IP 'chmod 700 /root/goldridr/scripts/deploy.sh'
```

The GitHub workflow does not upload or overwrite these server-owned files. During deployment it authenticates the server to GHCR and invokes `/root/goldridr/scripts/deploy.sh`; that script runs `docker compose pull` and `docker compose up` directly on Hetzner. When the service layout changes, update the server copies before deploying the corresponding application release.

Each successful pipeline deployment writes its immutable web, PocketBase, and worker image references into `/root/goldridr/.env`. This allows normal server-side operation without exporting pipeline variables:

```bash
cd /root/goldridr
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d --wait
```

Before the first pipeline deployment, the Compose file falls back to the three `latest` GHCR tags. If the packages are private, run `docker login ghcr.io` once as `root` before pulling them.

Create `/root/goldridr/.env` directly on the server. Start from `.env.example`, use production values, and never commit this file. At minimum set `AUTH_SECRET`, administrator credentials, the database configuration, the public base URL, and the notification provider configuration. Set `POCKETBASE_URL=http://pocketbase:8090`; the deployment script rejects any other value. `POCKETBASE_HOST_PORT` is optional and defaults to `8091`.

When using the local SQLite fallback, the web app and notification worker share `/root/goldridr/data`; the Next.js cache is under `/root/goldridr/.next-cache`; and PocketBase data is under `/root/goldridr/pocketbase-data`. The containers communicate through `http://pocketbase:8090`. PocketBase is available to host-side administration tools at `127.0.0.1:8091` but is not publicly exposed. The worker runs `npm run notifications:worker`, uses the same `.env`, restarts automatically, and receives 30 seconds to stop cleanly during releases.

The Compose Nginx service listens publicly on `${HTTP_PORT:-80}` and proxies to `web:3000`. The Next.js port is only exposed to the internal Compose network. Allow TCP port 80 through the Hetzner firewall; set `HTTP_PORT` in `/root/goldridr/.env` only if another host port is required.

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

## Nginx and TLS

The checked-in `nginx/nginx.conf` preserves the original host and forwarding headers, supports WebSocket upgrades, and disables proxy buffering for App Router streaming. Nginx currently serves HTTP on port 80. Before public production use, either add certificate mounts and a TLS server block to this Compose service or terminate TLS at a trusted proxy or load balancer in front of it.

If a host-level Nginx or another process already binds port 80, stop it or choose a different `HTTP_PORT` before starting this stack.
