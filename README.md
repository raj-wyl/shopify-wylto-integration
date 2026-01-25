# Wylto-Shopify Integration

> WhatsApp messaging integration for Shopify stores via Wylto platform

[![Shopify App](https://img.shields.io/badge/Shopify-App-95bf47)](https://shopify.dev)
[![React Router](https://img.shields.io/badge/React_Router-7.10-blue)](https://reactrouter.com)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.19-green)](https://nodejs.org)

## Overview

Wylto-Shopify Integration is a public Shopify app that connects your Shopify store with Wylto's WhatsApp messaging platform. It enables automated customer notifications for:

- ✅ **Order Confirmations** - Instant order confirmation via WhatsApp
- 📦 **Shipping Updates** - Real-time fulfillment and tracking notifications
- 🛒 **Abandoned Cart Recovery** - Automated reminders for incomplete checkouts
- 🔄 **Order Updates** - Status changes and modifications
- ❌ **Cancellation Notices** - Order cancellation notifications

## Quick Links

- **Production URL:** https://wylto-production-pfcaxtk5da-el.a.run.app
- **Documentation:** [ARCHITECTURE.md](./ARCHITECTURE.md) | [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **Shopify Partner Dashboard:** https://partners.shopify.com
- **Wylto Dashboard:** https://wylto.com

## Features

### Automated Messaging
- 📱 **5 Message Templates** for different customer touchpoints
- 🤖 **10 Webhook Handlers** for real-time event processing
- 🔗 **Seamless Integration** with Shopify's webhook system

### Security & Compliance
- 🔐 **OAuth 2.0 Authentication** with Shopify
- ✅ **HMAC Validation** for all webhooks
- 🛡️ **GDPR Compliance** webhooks for data privacy
- 🔑 **API Token Authentication** with Wylto backend

### Developer Experience
- ⚡ **Fast Development** with Vite and HMR
- 📦 **Serverless Deployment** on Google Cloud Run
- 🧪 **Test Mode** for development without API access
- 📊 **Comprehensive Logging** for debugging

## Architecture

```
┌─────────────────┐
│ Shopify Store   │
│  - Orders       │
│  - Fulfillments │
│  - Checkouts    │
└────────┬────────┘
         │ Webhooks
         ▼
┌─────────────────────────┐
│ Wylto Shopify App       │
│  - OAuth Handler        │
│  - Webhook Processors   │
│  - Connection Manager   │
└────────┬────────────────┘
         │ API Calls
         ▼
┌─────────────────────────┐
│ Wylto Backend Server    │
│  - Message Templates    │
│  - WhatsApp API         │
│  - Customer Database    │
└────────┬────────────────┘
         │ WhatsApp
         ▼
┌─────────────────┐
│ Customer        │
│  📱 WhatsApp    │
└─────────────────┘
```

**For detailed architecture diagrams, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

## Prerequisites

### System Requirements
- **Node.js** >= 20.19 (or >= 22.12)
- **npm** >= 9.0
- **Git**

### Shopify Requirements
- **Shopify Partner Account** ([Sign up here](https://partners.shopify.com))
- **App Created** in Partner Dashboard
- **Test Store** for development

### Wylto Requirements
- **Wylto Account** with API access
- **API Token** from Wylto dashboard

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd shopify-wylto-integration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:

```bash
# Shopify App Credentials (from Partner Dashboard)
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-app-url.com

# Wylto API Configuration
WYLTO_API_TOKEN=your_wylto_token_here
WYLTO_API_BASE_URL=https://server.wylto.com  # Optional

# App Permissions (comma-separated, no spaces)
SCOPES=read_checkouts,read_customers,read_fulfillments,read_orders,read_products

# Optional: Development Settings
WYLTO_TEST_MODE=false  # Set to "true" for testing
PORT=3000
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## Configuration

### Shopify App Setup

1. **Create App** in [Shopify Partner Dashboard](https://partners.shopify.com)
   - Click "Apps" → "Create app"
   - Choose "Public app"
   - Enter app name: "Wylto"

2. **Configure App URLs**
   - App URL: `https://your-app-url.com`
   - Allowed redirection URLs:
     - `https://your-app-url.com/auth/callback`
     - `https://your-app-url.com/auth/shopify/callback`
     - `https://your-app-url.com/api/auth/callback`

3. **Set API Scopes**
   ```
   read_checkouts
   read_customers
   read_fulfillments
   read_orders
   read_products
   ```

4. **Copy Credentials**
   - Copy "API key" to `SHOPIFY_API_KEY`
   - Copy "API secret key" to `SHOPIFY_API_SECRET`

### Wylto Dashboard Setup

1. **Login to Wylto** at [https://wylto.com](https://wylto.com)
2. Navigate to **Settings** → **Integrations**
3. Generate **Shopify API Token**
4. Copy token to `WYLTO_API_TOKEN`

## Usage

### For Merchants

#### 1. Install App on Shopify Store

1. Visit app installation URL (provided by Shopify Partner Dashboard)
2. Click "Install app"
3. Review and approve permissions
4. Redirected to app home page

#### 2. Connect Wylto Account

1. Login to Wylto dashboard
2. Copy your Shopify integration token
3. In Shopify admin, open Wylto app
4. Paste token and click "Connect"
5. Verify connection success

#### 3. Automatic Notifications

Once connected, customers automatically receive WhatsApp messages for:
- New orders
- Order updates
- Shipment tracking
- Abandoned cart reminders

### For Developers

#### Running Locally

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start
```

#### Testing Webhooks

```bash
# Install Shopify CLI
npm install -g @shopify/cli

# Trigger test webhooks
shopify app webhook trigger --topic=orders/create
shopify app webhook trigger --topic=fulfillments/create
shopify app webhook trigger --topic=checkouts/create
```

#### Using Test Mode

For development without Wylto API access:

```bash
# Enable test mode in .env
WYLTO_TEST_MODE=true

# Restart server
npm run dev
```

Test mode returns mock responses for all Wylto API calls.

## Project Structure

```
shopify-wylto-integration/
├── app/
│   ├── routes/                   # Route handlers
│   │   ├── auth.login/          # Login page
│   │   ├── auth.$.jsx           # OAuth callback
│   │   ├── app._index.jsx       # Home page
│   │   ├── app.how-to-use.jsx   # Documentation
│   │   └── webhooks.*.jsx       # 10 webhook handlers
│   │
│   ├── shopify.server.js        # Shopify configuration
│   ├── wylto-connection.server.js # Wylto API client
│   ├── wylto.server.js          # Message templates
│   ├── entry.server.jsx         # Server entry
│   └── root.jsx                 # Root component
│
├── public/                       # Static assets
├── build/                        # Build output
│
├── shopify.app.toml             # App manifest
├── vite.config.js               # Build config
├── package.json                 # Dependencies
└── .env                         # Environment variables
```

### Key Files Explained

| File | Purpose | Key Functions |
|------|---------|---------------|
| `shopify.server.js:19` | Shopify app config | `registerWebhooks()`, `afterAuth` hook |
| `wylto-connection.server.js:1` | Wylto API client | `saveAccessToken()`, `connectToApp()`, `checkConnectionStatus()` |
| `wylto.server.js:1` | Message templates | `renderTemplate()`, `getTemplateInfo()` |
| `app._index.jsx:15` | Home page | Connection UI and form handling |
| `webhooks.*.jsx` | Webhook handlers | Forward events to Wylto |

## Deployment

### Google Cloud Run (Current)

```bash
# 1. Build application
npm run build

# 2. Deploy via Shopify CLI
npm run deploy

# 3. Verify deployment
# Visit: https://wylto-production-pfcaxtk5da-el.a.run.app
```

### Manual Deployment

```bash
# 1. Build Docker image
docker build -t wylto-shopify-app .

# 2. Tag image
docker tag wylto-shopify-app gcr.io/PROJECT_ID/wylto-shopify-app

# 3. Push to Google Container Registry
docker push gcr.io/PROJECT_ID/wylto-shopify-app

# 4. Deploy to Cloud Run
gcloud run deploy wylto-production \
  --image gcr.io/PROJECT_ID/wylto-shopify-app \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated
```

### Environment Variables (Production)

Set in Cloud Run console:
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `WYLTO_API_TOKEN`
- `SCOPES`

## Documentation

### For Developers

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture, data flow diagrams, and system design
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Detailed code walkthrough for junior developers

### Quick Reference

#### Webhook Topics

| Topic | When Triggered | Template Used |
|-------|----------------|---------------|
| `orders/create` | New order placed | ORDER_CREATED |
| `orders/updated` | Order status changed | ORDER_UPDATED |
| `fulfillments/create` | Order shipped | ORDER_FULFILLED |
| `checkouts/create` | Checkout started | CART_RECOVERY |
| `checkouts/update` | Checkout updated | CART_RECOVERY |

#### API Endpoints (Wylto Backend)

| Endpoint | Method | Purpose | Called From |
|----------|--------|---------|-------------|
| `/api/shopify/connect` | POST | Save access token | OAuth flow |
| `/api/shopify/applink` | POST | Link store to account | Home page |
| `/api/shopify/status` | GET | Check connection | Home page |
| `/api/shopify/webhook` | POST | Process webhook | Webhook handlers |

## Troubleshooting

### Common Issues

#### Issue: OAuth fails with "Invalid credentials"

**Solution:**
1. Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` match Partner Dashboard
2. Check `SHOPIFY_APP_URL` matches configured app URL
3. Ensure redirect URLs are configured correctly

#### Issue: Webhooks return 401 Unauthorized

**Solution:**
1. HMAC validation failing - check `SHOPIFY_API_SECRET`
2. Reinstall app to re-register webhooks
3. Verify webhook URLs in Partner Dashboard

#### Issue: "Store not found" when connecting

**Solution:**
1. Check `afterAuth` hook logs for errors
2. Verify `WYLTO_API_TOKEN` is correct
3. Ensure access token was saved during OAuth
4. Try reinstalling the app

#### Issue: Messages not sending

**Solution:**
1. Verify store is connected (check home page)
2. Check Wylto dashboard for active subscription
3. Verify customer phone numbers are valid
4. Check Cloud Run logs for errors

### Navigating/redirecting breaks an embedded app

Embedded apps must maintain the user session, which can be tricky inside an iFrame. To avoid issues:

1. Use `Link` from `react-router` or `@shopify/polaris`. Do not use `<a>`.
2. Use `redirect` returned from `authenticate.admin`. Do not use `redirect` from `react-router`
3. Use `useSubmit` from `react-router`.

This only applies if your app is embedded, which it will be by default.

### Webhooks: shop-specific webhook subscriptions aren't updated

If you are registering webhooks in the `afterAuth` hook, using `shopify.registerWebhooks`, you may find that your subscriptions aren't being updated.  

Instead of using the `afterAuth` hook declare app-specific webhooks in the `shopify.app.toml` file.  This approach is easier since Shopify will automatically sync changes every time you run `deploy` (e.g: `npm run deploy`).  Please read these guides to understand more:

1. [app-specific vs shop-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions)
2. [Create a subscription tutorial](https://shopify.dev/docs/apps/build/webhooks/subscribe/get-started?deliveryMethod=https)

If you do need shop-specific webhooks, keep in mind that the package calls `afterAuth` in 2 scenarios:

- After installing the app
- When an access token expires

During normal development, the app won't need to re-authenticate most of the time, so shop-specific subscriptions aren't updated. To force your app to update the subscriptions, uninstall and reinstall the app. Revisiting the app will call the `afterAuth` hook.

### Webhooks: Admin created webhook failing HMAC validation

Webhooks subscriptions created in the [Shopify admin](https://help.shopify.com/en/manual/orders/notifications/webhooks) will fail HMAC validation. This is because the webhook payload is not signed with your app's secret key.  

The recommended solution is to use [app-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions) defined in your toml file instead.  Test your webhooks by triggering events manually in the Shopify admin(e.g. Updating the product title to trigger a `PRODUCTS_UPDATE`).

### Webhooks: Admin object undefined on webhook events triggered by the CLI

When you trigger a webhook event using the Shopify CLI, the `admin` object will be `undefined`. This is because the CLI triggers an event with a valid, but non-existent, shop. The `admin` object is only available when the webhook is triggered by a shop that has installed the app.  This is expected.

Webhooks triggered by the CLI are intended for initial experimentation testing of your webhook configuration. For more information on how to test your webhooks, see the [Shopify CLI documentation](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger).

### Incorrect GraphQL Hints

By default the [graphql.vscode-graphql](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) extension for will assume that GraphQL queries or mutations are for the [Shopify Admin API](https://shopify.dev/docs/api/admin). This is a sensible default, but it may not be true if:

1. You use another Shopify API such as the storefront API.
2. You use a third party GraphQL API.

If so, please update [.graphqlrc.ts](https://github.com/Shopify/shopify-app-template-react-router/blob/main/.graphqlrc.ts).

### Using Defer & await for streaming responses

By default the CLI uses a cloudflare tunnel. Unfortunately  cloudflare tunnels wait for the Response stream to finish, then sends one chunk.  This will not affect production.

To test [streaming using await](https://reactrouter.com/api/components/Await#await) during local development we recommend [localhost based development](https://shopify.dev/docs/apps/build/cli-for-apps/networking-options#localhost-based-development).

### "nbf" claim timestamp check failed

This is because a JWT token is expired.  If you  are consistently getting this error, it could be that the clock on your machine is not in sync with the server.  To fix this ensure you have enabled "Set time and date automatically" in the "Date and Time" settings on your computer.

### Using MongoDB and Prisma

If you choose to use MongoDB with Prisma, there are some gotchas in Prisma's MongoDB support to be aware of. Please see the [Prisma SessionStorage README](https://www.npmjs.com/package/@shopify/shopify-app-session-storage-prisma#mongodb).

### Unable to require(`C:\...\query_engine-windows.dll.node`).

Unable to require(`C:\...\query_engine-windows.dll.node`).
  The Prisma engines do not seem to be compatible with your system.

  query_engine-windows.dll.node is not a valid Win32 application.

**Fix:** Set the environment variable:
```shell
PRISMA_CLIENT_ENGINE_TYPE=binary
```

This forces Prisma to use the binary engine mode, which runs the query engine as a separate process and can work via emulation on Windows ARM64.

### Debug Logging

**Development:**
```bash
# Console shows all logs
npm run dev
```

**Production (Cloud Run):**
```bash
# View logs in Google Cloud Console
# Cloud Run → wylto-production → Logs
# Filter: severity >= INFO
```

### Getting Help

- **Issues:** [GitHub Issues](https://github.com/your-org/shopify-wylto-integration/issues)
- **Shopify Support:** [Shopify Community](https://community.shopify.com)
- **Wylto Support:** support@wylto.com

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Make** your changes
4. **Test** locally: `npm run dev`
5. **Commit** with clear messages: `git commit -m "Add: New feature description"`
6. **Push** to your fork: `git push origin feature/my-feature`
7. **Submit** a pull request

### Commit Message Format

```
Type: Brief description

- Detailed change 1
- Detailed change 2

Closes #issue-number
```

**Types:**
- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Enhancement to existing feature
- `Docs:` Documentation changes
- `Refactor:` Code restructuring
- `Test:` Testing additions

## License

Copyright © 2026 Wylto. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## Support

For technical support, please contact:
- **Email:** support@wylto.com
- **GitHub Issues:** [Report a bug](https://github.com/your-org/shopify-wylto-integration/issues)

---

**Version:** 1.0.0
**Last Updated:** 2026-01-25
**Maintained By:** Wylto Development Team
