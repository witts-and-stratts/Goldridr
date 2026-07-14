FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends g++ make python3 \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global npm@11.18.0 \
  && npm ci --prefer-offline --no-audit --no-fund

FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG DEPLOYMENT_VERSION
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_MAILPIT_UI_URL
ENV DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_MAILPIT_UI_URL=$NEXT_PUBLIC_MAILPIT_UI_URL

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build -- --turbopack

FROM node:22-bookworm-slim AS worker

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs worker \
  && mkdir -p /data \
  && chown -R worker:nodejs /app /data

COPY --from=dependencies --chown=worker:nodejs /app/node_modules ./node_modules
COPY --chown=worker:nodejs package.json package-lock.json tsconfig.json ./
COPY --chown=worker:nodejs scripts ./scripts
COPY --chown=worker:nodejs src ./src

USER worker

CMD ["npm", "run", "notifications:worker"]

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/.next/cache /data \
  && chown -R nextjs:nodejs /app /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
