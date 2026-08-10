# Wylto Shopify app — change log

A running record of what has changed in the Shopify app, grouped by area.
Newest work is at the top of each section. See `EMBEDDED_LOGIN.md` for the
embedded-login design in detail.

---

## Connect / home screen (`app/routes/app._index.jsx`)

- **Embedded login (dormant by default).** The connect screen can embed a Wylto
  login / API-token page in an `<iframe>` so the merchant never leaves the
  Shopify admin (App Store rule 2.2.2). Controlled by the `WYLTO_EMBED_TOKEN_URL`
  env var; **off by default** until Wylto provides a URL that is frameable and
  works without third-party cookies. See `EMBEDDED_LOGIN.md`.
- **Removed the "Open Wylto Dashboard →" button** from the connected view, so the
  app no longer pushes merchants out of the admin for a core action. The
  connected view now offers Disconnect only; template/automation management is
  done on the in-admin Templates and Automations pages.
- **"Get your API token" link** points at `app.wylto.com/login` (login, then the
  merchant opens Settings → API Settings). A direct deep link isn't possible
  pre-connect because the token page needs an account id we don't yet have.
- **Restored the Disconnect button.** Lets a merchant un-link a store from a
  Wylto account without uninstalling, and clears the 409 "already connected"
  dead-end. Calls `POST /api/shopify/appdisconnect` with `{ shop }` and the
  app-level token — no merchant token needed.
- **Redesign.** Branded hero (wordmark, brand gradient, live connection pill),
  connection details shown as labelled chips, and feature cards (Order
  Confirmation, Shipping & Delivery, Abandoned Cart, COD Confirmation).
- Dropped the "100% template compliance" claim (unsubstantiated-claim rule).

## Templates page (`app/routes/app.templates.jsx`)

- Lists the shop's WhatsApp templates with approval status (Approved / Pending
  approval / Rejected); a freshly created template shows as **Pending approval**
  until Meta reviews it.
- **Create from fixed template types** (dropdown), not free text: Order placed,
  Delivered, Order cancelled, Abandoned cart. Each type has a fixed body and a
  known parameter order, so the placeholders always match what the backend
  fills. Abandoned cart includes the cart link as `{{2}}`.
- Duplicate template names are prevented (Meta requires unique names): the
  suggested name auto-increments and Create is disabled on a clash.
- Nested API error messages (e.g. Meta rejections) are surfaced to the merchant
  instead of a blank error.

## Automations page (`app/routes/app.automations.jsx`)

- Configure which approved template fires for each order stage, with an enable
  toggle per stage; saved via `POST /api/shopify/automations`.
- Stages offered: **Order placed, Delivered, Order cancelled** (verified), plus
  **Abandoned cart**. Payment received / in transit / out for delivery were
  removed as unverified. `abandonedCart` is only sent when enabled, so an
  unverified key can't break a save for other stages.
- Only **approved** templates appear in the picker. An enabled stage must have a
  template chosen before Save is allowed.
- Order-status keys match what Wylto's trigger supports (`created`, `delivered`,
  `cancelled`, `abandonedCart`); `fulfilled` was dropped (not a valid key).

## Server API helpers (`app/wylto-connection.server.js`)

- `getTemplates`, `createTemplate`, `getAutomations`, `saveAutomations`, plus a
  shared `wyltoRequest` wrapper (Bearer auth, JSON, timeout, error
  normalisation). Requests/responses are logged so shapes can be confirmed from
  Cloud Run logs.
- `disconnectFromApp` → `POST /api/shopify/appdisconnect` with `{ shop }` only.

## Navigation (`app/routes/app.jsx`)

- App nav: Home · Automations · Templates · How to use app.

## Webhooks — COD detection (`app/routes/webhooks.orders.*.jsx`)

- **Payment-method logging** on orders/create, orders/paid, orders/updated:
  logs `gateway`, `payment_gateway_names`, `financial_status`.
- **Finding:** a COD order is identified by
  `payment_gateway_names` containing `"Cash on Delivery (COD)"`. The legacy
  `gateway` field is empty (`N/A`) and must not be relied on. `financial_status`
  is `pending` for an unpaid COD (cash to collect) and `paid` once marked paid.
- Detection only — **no scope change and no new webhook.** COD needs no new
  Shopify permission or subscription; the data already arrives on the existing
  order webhooks.

## Known / pending (not in the app yet)

- **Embedded login URL** — waiting on Wylto for a frameable, cookie-free login /
  API-token URL; then set `WYLTO_EMBED_TOKEN_URL` and verify in incognito.
- **COD confirmation & payment link** — a Wylto platform build (needs a `cod`
  automation status, a confirmation page, and WA Payments). Writing the result
  back onto the Shopify order would need the `write_orders` scope; if the status
  lives only in Wylto, no new scope is needed.
- The home page still shows a **"COD Confirmation"** feature card for a flow that
  isn't built yet.
