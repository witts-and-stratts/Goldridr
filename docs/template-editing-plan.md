# Backend-editable templates — implementation plan

Status: proposed
Scope: developer-owned React Email and React PDF defaults, with PocketBase overrides
for approved SMS and email content buckets.

## Goal

Allow administrators to customise the text of every transactional template from the
admin dashboard without a deploy, while keeping:

- code-defined defaults as the source of truth and fallback;
- A2P 10DLC compliance copy locked and server-enforced;
- React Email and React PDF layouts (booking card, QR, line items) code-driven;
- a full audit trail (who changed what, when) and one-click reset.

## Non-goals

- Free-form PDF layout editing. Invoice and receipt layout remains a React PDF component.
- Saving admin edits into a running deployment's source tree. Runtime file systems are
  immutable deployment artifacts; email overrides are stored in PocketBase.
- Editing user-composed content (`manual_message`, `broadcast`) — those already carry
  author input and should not have a stored template.
- Rich block editor, WYSIWYG, or visual builder in v1.

## Storage model

Use a hybrid model rather than file-only or database-only templates:

- **Code files are canonical:** SMS defaults live in `src/templates/sms/*.txt`, email
  defaults are React Email components, and invoices/receipts are React PDF components.
  The typed registry owns identities, variants, policy, and sample payloads.
- **PocketBase stores operational state only:** the current enabled content-bucket
  override
  (`templates`), immutable revision/audit history (`template_revisions`), and the
  resolved template snapshot attached to each queued delivery.
- **Delivery snapshots are immutable:** `createNotification()` resolves the template
  when a delivery is queued and persists the result on the delivery
  (`templateSnapshot`, `templateRevision`, `templateSource`, `templateVariant`). The
  worker renders from that snapshot, so retries and delayed sends reproduce the exact
  content even after a later edit. Pending deliveries are intentionally unaffected by
  subsequent edits; only newly enqueued deliveries use the new revision.
- **PDF is not a delivery:** invoice/receipt PDFs are generated on request from the
  admin/customer routes, so they resolve the current override at request time and have
  no snapshot.

A file-only implementation does not meet the no-deploy administrator-editing goal
without adding a Git/content deployment workflow, its credentials, review/publish
controls, deployment delay, and rollback complexity. Do not create a separate set of
file-based defaults outside the typed registry: that would introduce drift. Revision
history lives in PocketBase, not code, so edits require no deploy.

## Current state (source of truth)

| Channel | Definition | Rendering |
| --- | --- | --- |
| SMS | `src/templates/sms/*.txt` → `sms-program.ts` | parsed variables + `withCompliance()` suffix |
| Email | `src/lib/notifications/email-template.tsx` → `contentFor()` switch → `EmailContent` object; `GoldridrEmail` JSX layout | `@react-email/render` |
| PDF | `src/lib/invoices.ts` → `src/templates/pdf/goldridr-documents.tsx` | `@react-pdf/renderer` |
| Compliance | `src/lib/sms-consent-copy.ts` constants | appended in `withCompliance()` |
| Settings pattern | `src/lib/admin-settings.ts` (`first` + `writeSetting`) | PocketBase `app_settings` |
| Migrations | `pocketbase/pb_migrations/*.js` | `migrate((app) => {...})` |
| Preview | `src/app/admin/templates/` + `src/lib/template-catalog.ts` | built, dev-only |
| Enqueue | `src/lib/pocketbase/notifications.ts` → `createNotification()` | writes `notification_deliveries` rows (`template` + `payload`) |
| Worker | `src/lib/notifications/worker.ts` | claims deliveries, builds body/email, sends |

`src/lib/template-catalog.ts` (preview names + sample payloads + PDF builders) evolves
into the canonical typed registry described below; do not keep two registries.

## Template identities & variants

The typed registry (`src/lib/notifications/template-registry.ts`, evolving
`src/lib/template-catalog.ts`) is the single source of template identity. An entry is
keyed by `channel` + `templateId` and owns its label, description, editability,
compliance lock, `allowedVariables`, default-content factory, and sample payload.

Variants are first-class identities because several keys branch on the payload today.
The registry always derives `templateId` from `(key, payload)`:

| Key (`delivery.template`) | Variant selector | `templateId` examples |
| --- | --- | --- |
| `booking_status` | `payload.status` confirmed/accepted vs other | `booking_status:confirmed`, `booking_status:updated` |
| SMS `booking_assignment` | `payload.chauffeurName` present vs empty | `booking_assignment:assigned`, `booking_assignment:unassigned` |
| Email `booking_assignment` | `payload.action` assigned/reassigned vs removed | `booking_assignment:assigned`, `booking_assignment:unassigned` |
| all others | none | `booking_created`, `booking_reminder`, … |

Registry entries:

- **SMS:** `booking_created`, `payment_reminder`, `booking_reminder`,
  `booking_status:*`, `booking_assignment:*`, `booking_deleted`.
- **Email:** `booking_created`, `booking_status:*`, `booking_assignment:*`,
  `booking_deleted`, `booking_reminder`, `chauffeur_assignment`,
  `chauffeur_unassigned`, `chauffeur_reminder`, `delivery_failure`, `default`.
- **PDF:** `invoice`, `payment`.
- **Excluded (no registry entry, not editable):** `manual_message`, `broadcast`.

`allowedVariables` is per entry, so server-side validation rejects tokens a given
template cannot render.

### Adding a new template

Adding a transactional template is a code change, not an administrator-created record:

1. Add its registry entry with a stable ID, channel, default-content factory, editable
   fields, allowed variables, sample payload, and SMS policy where applicable.
2. Add or update the notification producer to enqueue its known `delivery.template` and
   complete payload. Add a variant selector when the message has conditional branches.
3. Extend `TemplateContext` only when a genuinely new variable is needed, then add it
   to that entry's allowlist and tests.
4. Add layout code only when it needs new structured email/PDF presentation; copy-only
   templates reuse the existing layout.
5. Add default-parity, variant-selection, rendering, and SMS-compliance tests.

No `templates` row is required for a code default. After deployment the registry makes
the template appear in the editor; the first administrator save creates its active
override and first revision. Adding ordinary JSON copy fields needs no migration, but a
new channel, delivery-snapshot field, or non-JSON structural requirement does.

## PocketBase schema

Two collections plus snapshot columns on `notification_deliveries`. `content` is JSON
so channel-specific fields evolve without migrations. Add
`templates: "templates"` and `templateRevisions: "template_revisions"` to
`src/lib/pocketbase/collections.ts`.

### `templates` — current override pointer (one row per template identity)

```js
{
  type: "base",
  name: "templates",
  listRule: null, viewRule: null, createRule: null,
  updateRule: null, deleteRule: null,
  fields: [
    { name: "created", type: "autodate", onCreate: true },
    { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    { name: "channel", type: "select", required: true, maxSelect: 1, values: ["email", "sms", "pdf"] },
    { name: "templateId", type: "text", required: true, max: 160 },
    { name: "enabled", type: "bool" },
    { name: "currentRevision", type: "number", required: true, onlyInt: true, min: 1 },
    { name: "content", type: "json", required: true, maxSize: 200000 },
    { name: "updatedBy", type: "text", max: 200 },
    { name: "sourceUpdatedAt", type: "date" },
  ],
  indexes: [
    "CREATE UNIQUE INDEX idx_templates_channel_id ON templates (channel, templateId)",
    "CREATE INDEX idx_templates_channel ON templates (channel)",
  ],
}
```

### `template_revisions` — immutable audit history

One row per state-changing action; never updated or deleted. `created` is `onCreate`
only. A reset or disable is therefore auditable even when the active pointer is removed
or no longer applies.

```js
{
  type: "base",
  name: "template_revisions",
  listRule: null, viewRule: null, createRule: null,
  updateRule: null, deleteRule: null,
  fields: [
    { name: "created", type: "autodate", onCreate: true },
    { name: "channel", type: "select", required: true, maxSelect: 1, values: ["email", "sms", "pdf"] },
    { name: "templateId", type: "text", required: true, max: 160 },
    { name: "revision", type: "number", required: true, onlyInt: true, min: 1 },
    { name: "action", type: "select", required: true, maxSelect: 1, values: ["created", "updated", "enabled", "disabled", "reset", "reverted"] },
    { name: "previousContent", type: "json", maxSize: 200000 },
    { name: "content", type: "json", maxSize: 200000 },
    { name: "createdBy", type: "text", max: 200 },
    { name: "note", type: "text", max: 500 },
  ],
  indexes: [
    "CREATE UNIQUE INDEX idx_template_revisions_identity ON template_revisions (channel, templateId, revision)",
    "CREATE INDEX idx_template_revisions_lookup ON template_revisions (channel, templateId, revision DESC)",
  ],
}
```

### `notification_deliveries` — snapshot columns

Add to the existing collection (`pocketbase/pb_migrations/1784023200_create_notification_foundation.js`):

```js
const deliveries = app.findCollectionByNameOrId("notification_deliveries");
deliveries.fields.add(new Field({ name: "templateVariant", type: "text", max: 80 }));
deliveries.fields.add(new Field({ name: "templateRevision", type: "number", onlyInt: true, min: 1 }));
deliveries.fields.add(new Field({ name: "templateSource", type: "select", maxSelect: 1, values: ["default", "override"] }));
deliveries.fields.add(new Field({ name: "templateSnapshot", type: "json", maxSize: 200000 }));
app.save(deliveries);
```

The existing `template` text column keeps storing the key; `templateId`/variant are
derived and snapshotted alongside it. All fields are JSON/primitive, so the snapshot is
serializable across the web→worker process boundary.

### `content` shape by channel

```ts
// sms
{ body: string }
// email
{ subject?: string; preview?: string; heading?: string; message: string; ctaLabel?: string; footerNote?: string }
// pdf
{ title?: string; intro?: string; footer?: string }
```

`enabled` lets an admin stage an override without applying it; disabled overrides still
retain their row and revision pointer. Compliance locks come from the registry
(`entry.locked`), **not** from a DB flag, so an admin cannot unlock regulated copy.

Every state-changing request includes `expectedRevision`. The server returns `409
Conflict` for a stale value instead of overwriting another administrator's work. The
current-pointer update and revision insert execute atomically in PocketBase (or an
equivalent server-side transaction).

## Variable contract

Single canonical context built from the notification payload, so code defaults and DB
overrides share one formatting path. Syntax: `{{ path.to.value }}` (whitespace
tolerated). No filters in v1 — every value is pre-formatted before it reaches the
template.

New module `src/lib/notifications/template-context.ts`:

```ts
export interface TemplateContext {
  booking: { reference: string; status: string; statusLabel: string };
  rider: { name: string; email: string; phone: string };
  trip: {
    type: string; serviceLabel: string; date: string; time: string;
    pickup: string; dropoff: string; passengers: string; flightNumber: string;
    terminal: string; duration: string; estimatedTotal: string; notes: string;
  };
  chauffeur: { name: string };
  links: { payment: string; booking: string; verify: string; qrImage: string };
  company: { name: string; supportEmail: string; appUrl: string };
  pin: string;
  reminderHours: string;
  message: string;
  subject: string;
}

export function buildTemplateContext(payload: Record<string, unknown>): TemplateContext;
export function extractVariables(template: string): string[];
export function renderTemplate(template: string, context: TemplateContext): string;
export function listAvailableVariables(templateId: string): string[];
```

Formatting moves here (date → "Sat, Jun 14, 2026"; time → "9:30 AM"; currency, status
label, service label, duration). This is the same logic currently duplicated in
`email-template.tsx` (`formatBookingDate`, `formatBookingTime`, `formatCurrency`,
`tripTypeLabel`) and partially in `sms-program.ts`, so both collapse onto one source.

### Canonical variables

| Variable | Source |
| --- | --- |
| `{{ booking.reference }}` | `payload.bookingReference` |
| `{{ booking.status }}` / `{{ booking.statusLabel }}` | `payload.status` / `formatBookingStatus` |
| `{{ rider.name }}` / `{{ rider.email }}` / `{{ rider.phone }}` | `passengerName` / `passengerEmail` / `passengerPhone` |
| `{{ trip.type }}` / `{{ trip.serviceLabel }}` | `payload.tripType` / `tripTypeLabel` |
| `{{ trip.date }}` / `{{ trip.time }}` | formatted `payload.date` / `payload.time` |
| `{{ trip.pickup }}` / `{{ trip.dropoff }}` | `tripDetails.pickupLocation` / `dropoffLocation` |
| `{{ trip.passengers }}` / `{{ trip.flightNumber }}` / `{{ trip.terminal }}` | `tripDetails.*` |
| `{{ trip.duration }}` | hourly duration formatting |
| `{{ trip.estimatedTotal }}` | formatted `tripDetails.estimatedTotal` |
| `{{ trip.notes }}` | `payload.notes` |
| `{{ chauffeur.name }}` | `payload.chauffeurName` |
| `{{ pin }}` | `payload.pin` |
| `{{ reminderHours }}` | `payload.reminderHours` |
| `{{ message }}` / `{{ subject }}` | author input (manual/broadcast) |
| `{{ links.payment }}` / `.booking` / `.verify` / `.qrImage` | `paymentUrl`, `${appUrl}/admin/bookings`, `getBookingVerifyUrl`, `getBookingQrImageUrl` |
| `{{ company.name }}` / `{{ company.supportEmail }}` / `{{ company.appUrl }}` | constants / settings |

Legacy flat aliases (`{{bookingReference}}`, `{{passengerName}}`, `{{date}}`,
`{{time}}`, `{{tripDetails.terminal}}`, …) are also emitted for one release so existing
sample payloads and any in-flight overrides keep resolving.

## Resolution & rendering

New module `src/lib/notifications/template-store.ts`:

```ts
export type TemplateChannel = "email" | "sms" | "pdf";

export interface ResolvedTemplate {
  templateId: string;
  variant: string;
  source: "default" | "override";
  revision: number;          // 0 when serving the registry default
  content: TemplateContent;
  context: TemplateContext;  // built from the payload, shared by both sources
}

export async function resolveTemplate(
  channel: TemplateChannel,
  key: string,
  payload: Record<string, unknown>
): Promise<ResolvedTemplate>;
```

Flow:

1. Registry maps `(key, payload)` → `templateId` (variant selected from the payload).
2. Look up `templates` for `(channel, templateId)`.
3. If an enabled override exists, use its `content` + `currentRevision`; otherwise build
   the registry default content (`source: "default"`, `revision: 0`).
4. Build `TemplateContext` from the payload and run `renderTemplate` over the override
   strings.

**Snapshot at enqueue.** `createNotification()` in
`src/lib/pocketbase/notifications.ts` calls `resolveTemplate()` for each delivery and
persists `templateSnapshot`, `templateRevision`, `templateSource`, `templateVariant` on
the `notification_deliveries` row. The worker (`src/lib/notifications/worker.ts`)
renders from `templateSnapshot` and never re-resolves, so a lease retry or delayed send
cannot pick up a later edit. The snapshot carries the resolved content, not the raw
override, so the worker does not depend on the registry version that queued it.

The notification record, every resolved delivery snapshot, recipients, and delivery rows
must be written atomically. A failed resolution or insert must leave neither an orphan
notification nor a partially queued set of recipients.

- **Unknown variables:** `renderTemplate` substitutes `""` at render time and logs a
  warning; the admin preview flags them before save.
- **Cache:** in-process Map with a 30–60s TTL keyed by `channel:templateId`. Resolution
  happens at enqueue, so the cache only needs to be fresh for new deliveries and
  cross-process invalidation is unnecessary. `sourceUpdatedAt` can be surfaced in the UI
  ("applied within a minute").
- **PDF** resolves at request time in `invoicePdf()` / `paymentPdf()`; no snapshot.

### Wire-in points

- `createNotification()` (`src/lib/pocketbase/notifications.ts:20`) → resolve + snapshot
  every email/SMS delivery before insert.
- `worker.ts` email branch → build `EmailContent` from the snapshot and render
  `GoldridrEmail`; `contentFor()` becomes the registry's default-content factory.
- `worker.ts` SMS branch → send `snapshot.body`, then always append compliance via
  `withCompliance()`; compliance copy is never part of an override.
- `sms-program.ts` → `buildSmsBody()` becomes the SMS default factory behind the
  registry.
- `invoices.ts` → request-time override for `title` / `intro` / `footer` only; line
  items stay code-derived from the booking/payment records.

## API routes

All admin-gated (`getRequestSession` + `isAdmin`), writes recorded with `updatedBy`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/admin/templates` | List all templates: default content, override, source, metadata |
| GET | `/api/admin/templates/[channel]/[templateId]` | Single resolved template + available variables |
| PUT | `/api/admin/templates/[channel]/[templateId]` | Require `expectedRevision`; atomically write a revision and update the current pointer; return `409` when stale. |
| DELETE | `/api/admin/templates/[channel]/[templateId]` | Require `expectedRevision`; reset to default and retain a `reset` revision; return `409` when stale. |
| POST | `/api/admin/templates/[channel]/[templateId]/enabled` | Require `expectedRevision`; enable/disable and append an audit revision. |
| GET | `/api/admin/templates/[channel]/[templateId]/revisions` | Revision history for audit/revert |
| POST | `/api/admin/templates/preview` | Render arbitrary content against a sample payload |

Validation (zod/v4, matching existing routes):

- `channel`/`templateId` must resolve to a registry entry; reject locked entries.
- Every state-changing request must provide the current `expectedRevision`.
- Reject unknown `{{ variables }}`; warn on required-but-empty values.
- SMS: enforce max length / segment budget; compliance suffix recomputed and shown.
- Email: administrators may edit only approved text buckets; React Email owns all
  markup, layout, and structured booking data.
- PDF: developer-owned React PDF components; no admin layout editor.
- `manual_message` / `broadcast` have no registry entry → 400.

## Admin UI

Extend `src/app/admin/templates/` (already a 3-pane Inbox-style shell):

- Add a **Customise** action in the detail header for editable templates.
- Editor pane: channel-appropriate fields (SMS body; email subject/preview/heading/
  message/CTA/footer; PDF title/intro/footer), a variable palette that inserts at the
  caret, and inline "unknown variable" markers.
- Live preview reuses the existing server render path and the preview API route.
- Metadata row: source (Default / Custom), last edited by/at, revision, **Save**,
  **Reset to default**, optional **Disable override** toggle, and a revision-history
  drawer (view/revert).
- RBAC: the preview page is `developmentOnly` + `adminOnly` today. Once editing ships,
  the nav item must be admin-only and available in production; either drop
  `developmentOnly` for the whole page or split preview (dev-only) from editing (prod).

## Phased delivery

| Phase | Deliverable | Estimate |
| --- | --- | --- |
| 0 | Typed registry (`template-registry.ts`) evolving `template-catalog.ts` + `template-context.ts` + `renderTemplate`/`extractVariables`, migrate email/SMS formatters onto it, unit tests | 2 d |
| 1 | Migrations (`templates`, `template_revisions`, delivery snapshot columns), `template-store.ts`, resolve + snapshot in `createNotification()`, worker renders from snapshot, SMS default factory wired, tests | 2–3 d |
| 2 | SMS admin API + editor UI + preview wiring | 1–2 d |
| 3 | Email content-bucket overrides and editor fields | 2–3 d |
| 4 | React PDF component migration | 1 d |
| 5 | Revision history drawer, revert, richer audit | 2 d |

Phases 0–4 are the useful release (~1.5–2 weeks). Phase 5 hardens it. The snapshot
work lands in Phase 1 because it changes the enqueue/worker contract.

## Risks & mitigations

- **A2P drift** — compliance suffix and opt-in disclosure stay in
  `sms-consent-copy.ts`, appended outside the editable body; compliance locks come from
  the registry, not a DB flag. Extend the existing `tests/` A2P copy assertions to cover
  override rendering and snapshot output.
- **Enqueue/render split** — resolution runs in the web process, rendering in the
  worker. Both must share the registry, and the snapshot must be JSON-only, so keep
  `TemplateContent`/`TemplateContext` serializable types.
- **Stale overrides vs pending deliveries** — snapshots intentionally freeze pending
  sends. Document that an edit applies only to deliveries queued after the save.
- **Worker caching** — short TTL at enqueue avoids stale overrides without
  cross-process pub/sub.
- **Escaping** — React Email escapes the administrator's text content during rendering;
  administrators cannot submit email markup.
- **Financial documents** — invoices/receipts only expose title/intro/footer; line
  items stay code-derived from records.
- **Key drift** — the registry is the single key authority for the catalog, resolver,
  validation, and editor, so a new template appears everywhere at once.

## Tests

- `renderTemplate` / `extractVariables`: nested paths, missing keys, whitespace.
- `buildTemplateContext`: formatting parity with existing email helpers.
- `resolveTemplate`: variant selection, override vs default, `enabled=false`, unknown id, TTL.
- Enqueue snapshot: `createNotification()` persists revision/source/snapshot; a retry
  after an edit still renders the original snapshot.
- API routes: auth, validation, revision write + pointer bump, reset, locked rejection.
- Regression: existing notification + A2P tests still pass with no overrides present.
