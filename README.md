This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Goldridr
# Notifications

The application stores notification events and channel deliveries in the same SQLite transaction as booking changes. Run the durable worker as a separate process:

```bash
npm run notifications:worker
```

Keep transport and credential secrets in `.env`, then manage runtime values like booking buffer, timezone, app URL, sender identity, pricing, and discount codes in `/admin/settings`. Set `EMAIL_TRANSPORT` to `mailpit`, `smtp`, `ses_smtp`, `ses_api`, or `resend`, then configure the matching variables in `.env.example`. Mailpit listens on `127.0.0.1:1025` and exposes the inbox at `http://localhost:8025`. Set `TWILIO_TRANSPORT=mock` to keep SMS traffic in the local SQLite-backed mock inbox, or `TWILIO_TRANSPORT=twilio` to send real messages.

The admin test bench lives at `/admin/testing` and exposes the mock SMS API at `/api/admin/testing/sms`.

Provider callbacks:

- Resend: `POST /api/webhooks/resend`
- Amazon SES configuration-set events through SNS: `POST /api/webhooks/ses`

Both routes reject unsigned payloads. Staff receive authenticated, user-isolated live updates from `/api/admin/notifications/stream`.
