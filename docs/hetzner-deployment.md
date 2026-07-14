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

Create `/root/goldridr/.env` directly on the server. Start from `.env.example`, use production values, and never commit this file. At minimum set `AUTH_SECRET`, administrator credentials, the database configuration, the public base URL, and the notification provider configuration. Set `POCKETBASE_URL=http://pocketbase:8090`; the deployment script rejects any other value. `POCKETBASE_HOST_PORT` is optional and defaults to `8091`.

When using the local SQLite fallback, the web app and notification worker share `/root/goldridr/data`; the Next.js cache is under `/root/goldridr/.next-cache`; and PocketBase data is under `/root/goldridr/pocketbase-data`. The containers communicate through `http://pocketbase:8090`. PocketBase is available to host-side administration tools at `127.0.0.1:8091` but is not publicly exposed. The worker runs `npm run notifications:worker`, uses the same `.env`, restarts automatically, and receives 30 seconds to stop cleanly during releases.

Put nginx or Caddy in front of `127.0.0.1:3000` and terminate TLS there. The application port is intentionally not exposed publicly.

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

## Reverse proxy example

For nginx, proxy the public virtual host to `http://127.0.0.1:3000`, preserve `Host` and forwarding headers, and disable response buffering so App Router streaming is not buffered:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
}
```
