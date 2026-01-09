# Shopify-Wylto Integration - Architecture Overview

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SHOPIFY ECOSYSTEM                        │
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │  Merchant Store │         │  Shopify Admin  │               │
│  │  (Storefront)   │         │   (Dashboard)   │               │
│  └────────┬────────┘         └────────┬────────┘               │
│           │                           │                         │
│           │ Customer Actions          │ Merchant Uses App       │
│           │ (Orders, Carts)          │                         │
│           │                           │                         │
│  ┌────────▼───────────────────────────▼────────┐               │
│  │        Shopify Platform (API)                │               │
│  │  - Processes orders                          │               │
│  │  - Fires webhooks                            │               │
│  │  - Manages OAuth                             │               │
│  └────────┬─────────────────────────┬───────────┘               │
│           │                         │                           │
└───────────┼─────────────────────────┼───────────────────────────┘
            │                         │
            │ Webhooks (POST)         │ OAuth / GraphQL
            │                         │
┌───────────▼─────────────────────────▼───────────────────────────┐
│                    YOUR SHOPIFY APP                              │
│                  (shopify-wylto-integration)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ROUTES (React Router v7)               │  │
│  │                                                            │  │
│  │  PUBLIC ROUTES:                                           │  │
│  │  ┌──────────────┐                                         │  │
│  │  │ / (Landing)  │ ← Shop login form                       │  │
│  │  └──────────────┘                                         │  │
│  │                                                            │  │
│  │  AUTH ROUTES:                                             │  │
│  │  ┌──────────────┐                                         │  │
│  │  │ /auth/*      │ ← OAuth callback handler                │  │
│  │  └──────────────┘                                         │  │
│  │                                                            │  │
│  │  EMBEDDED APP ROUTES (inside Shopify Admin):              │  │
│  │  ┌──────────────┐  ┌──────────────┐                      │  │
│  │  │ /app         │  │ /app/settings│ (TODO)                │  │
│  │  │ (Dashboard)  │  │ (Wylto Config)│                      │  │
│  │  └──────────────┘  └──────────────┘                      │  │
│  │                                                            │  │
│  │  WEBHOOK ROUTES:                                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ /webhooks/orders/create                            │  │  │
│  │  │ /webhooks/orders/updated                           │  │  │
│  │  │ /webhooks/fulfillments/create                      │  │  │
│  │  │ /webhooks/checkouts/create                         │  │  │
│  │  │ /webhooks/checkouts/update                         │  │  │
│  │  │ /webhooks/app/uninstalled                          │  │  │
│  │  │ /webhooks/app/scopes_update                        │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │              BUSINESS LOGIC LAYER                         │  │
│  │                                                            │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐        │  │
│  │  │ shopify.server.js   │  │ db.server.js        │        │  │
│  │  │ - OAuth             │  │ - Prisma Client     │        │  │
│  │  │ - Webhook Registry  │  │ - DB Singleton      │        │  │
│  │  │ - API Client        │  │                     │        │  │
│  │  └─────────────────────┘  └─────────────────────┘        │  │
│  │                                                            │  │
│  │  ┌─────────────────────┐ (TODO)                          │  │
│  │  │ wylto.server.js     │                                  │  │
│  │  │ - Send WhatsApp     │                                  │  │
│  │  │ - Get Status        │                                  │  │
│  │  └─────────────────────┘                                  │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │                  DATABASE LAYER (Prisma)                  │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ Session  │  │  Store   │  │ Webhook  │  │ Message  │ │  │
│  │  │          │  │          │  │   Log    │  │   Log    │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  │                                                            │  │
│  │  ┌──────────┐                                             │  │
│  │  │ Pending  │                                             │  │
│  │  │  Cart    │                                             │  │
│  │  └──────────┘                                             │  │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ HTTP POST (TODO)
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                      WYLTO WHATSAPP API                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  POST /send                                                 │ │
│  │  {                                                          │ │
│  │    "api_key": "shop_wylto_key",                            │ │
│  │    "to": "+919876543210",                                  │ │
│  │    "message": "Your order #1001 is confirmed!"             │ │
│  │  }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ WhatsApp Message
                           │
                   ┌───────▼────────┐
                   │   CUSTOMER     │
                   │  (WhatsApp)    │
                   └────────────────┘
```

---

## 🔄 Data Flow Diagrams

### **1. Order Confirmation Flow**

```
Customer → Place Order
    │
    ▼
[Shopify Platform]
    │
    │ Webhook: orders/create
    │ POST /webhooks/orders/create
    │ Payload: { id, customer: {phone}, total, ... }
    │
    ▼
[Your App: webhooks.orders.create.jsx]
    │
    ├─→ [1] Log to WebhookLog
    │       (shopDomain, topic, payload, status: "processing")
    │
    ├─→ [2] Extract Data
    │       order_id = payload.id
    │       phone = payload.customer.phone
    │       total = payload.total_price
    │
    ├─→ [3] Get Store Config
    │       query Store where shopDomain = shop
    │       get wyltoApiKey
    │
    ├─→ [4] Call Wylto API (TODO)
    │       POST https://api.wylto.com/send
    │       { api_key, to: phone, message: "Order #X confirmed!" }
    │       response: { message_id: "wylto_123" }
    │
    ├─→ [5] Log Message
    │       insert MessageLog
    │       (shopDomain, recipient, messageType: "order_confirmation",
    │        referenceId: order_id, wyltoMessageId: "wylto_123",
    │        status: "sent", sentAt: NOW())
    │
    └─→ [6] Update Webhook Status
            update WebhookLog status = "completed"
    │
    ▼
Customer receives WhatsApp message
```

---

### **2. Abandoned Cart Recovery Flow**

```
Customer → Add to Cart → Checkout → Enter Phone → Close Tab
    │
    ▼
[Shopify Platform]
    │
    │ Webhook: checkouts/create
    │ POST /webhooks/checkouts/create
    │ Payload: { token, phone, abandoned_checkout_url, ... }
    │
    ▼
[Your App: webhooks.checkouts.create.jsx]
    │
    ├─→ [1] Log to WebhookLog
    │
    ├─→ [2] Check if Abandoned
    │       if (payload.phone && payload.abandoned_checkout_url)
    │
    └─→ [3] Create PendingCart
            insert PendingCart
            (checkoutToken: token,
             customerPhone: phone,
             cartUrl: abandoned_checkout_url,
             scheduledFor: NOW() + 1 hour,
             status: "pending")
    │
    ▼
[Scheduled Job - Runs Every 5 Minutes] (TODO)
    │
    ├─→ [1] Query Pending Carts
    │       SELECT * FROM PendingCart
    │       WHERE status = 'pending'
    │       AND scheduledFor <= NOW()
    │
    ├─→ [2] For Each Cart
    │   │
    │   ├─→ Get Store's wyltoApiKey
    │   │
    │   ├─→ Call Wylto API
    │   │       message: "You left items in cart! Complete: {cartUrl}"
    │   │
    │   └─→ Update PendingCart
    │           status = "sent"
    │           sentAt = NOW()
    │
    ▼
Customer receives WhatsApp reminder

IF Customer completes checkout:
    │
    ▼
[Shopify Platform]
    │
    │ Webhook: checkouts/update
    │ Payload: { token, completed_at: "2025-12-19T..." }
    │
    ▼
[Your App: webhooks.checkouts.update.jsx]
    │
    └─→ Update PendingCart
            WHERE checkoutToken = token
            SET status = "converted"
```

---

### **3. OAuth Installation Flow**

```
Merchant → Shopify App Store → Click "Install"
    │
    ▼
[Shopify] Redirect to your app's landing page
    │
    │ https://your-app.com/?shop=merchant-store.myshopify.com
    │
    ▼
[Your App: /_index/route.jsx]
    │
    │ Display login form
    │ Merchant enters shop domain
    │
    ▼
POST /auth/login
    │
    ▼
[Shopify OAuth] Redirect to Shopify
    │
    │ https://merchant-store.myshopify.com/admin/oauth/authorize
    │   ?client_id=XXX
    │   &scope=read_orders,read_checkouts,...
    │   &redirect_uri=https://your-app.com/auth/callback
    │
    ▼
Merchant sees permission request
    │
    │ "Grant access to read orders, checkouts, etc?"
    │
    ▼
Merchant clicks "Install"
    │
    ▼
[Shopify] Redirect back to your app
    │
    │ https://your-app.com/auth/callback?code=AUTH_CODE&shop=...
    │
    ▼
[Your App: /auth.$.jsx]
    │
    ├─→ [1] Exchange code for access token
    │       POST https://merchant-store.myshopify.com/admin/oauth/access_token
    │       response: { access_token: "shpat_XXX" }
    │
    ├─→ [2] Store Session
    │       insert Session
    │       (id, shop, accessToken, scope, ...)
    │
    ├─→ [3] Register Webhooks
    │       For each webhook in config:
    │         POST /admin/api/2026-01/webhooks.json
    │         { topic: "orders/create", address: "https://your-app.com/..." }
    │
    └─→ [4] Redirect to App
            https://merchant-store.myshopify.com/admin/apps/your-app
    │
    ▼
Merchant sees embedded app in Shopify Admin
```

---

## 🗂️ File Responsibilities

### **Core Files**

| File | Purpose | Key Exports |
|------|---------|-------------|
| `app/shopify.server.js` | Shopify SDK initialization | `authenticate`, `registerWebhooks`, `sessionStorage` |
| `app/db.server.js` | Prisma client singleton | `prisma` (default export) |
| `prisma/schema.prisma` | Database schema | Models: Session, Store, WebhookLog, MessageLog, PendingCart |
| `vite.config.js` | Build configuration | React Router alias, HMR settings |
| `shopify.app.wyl-store-bnglr.toml` | App config | Webhooks, scopes, client_id |

---

### **Route Files**

| Route | HTTP Method | Purpose | Authentication |
|-------|-------------|---------|----------------|
| `/_index/route.jsx` | GET | Public landing page | None |
| `/auth.$.jsx` | GET | OAuth callback | None |
| `/app._index.jsx` | GET/POST | Main dashboard | `authenticate.admin()` |
| `/app.jsx` | GET | App shell | `authenticate.admin()` |
| `/webhooks.orders.create.jsx` | POST | Handle new orders | `authenticate.webhook()` |
| `/webhooks.orders.updated.jsx` | POST | Handle order updates | `authenticate.webhook()` |
| `/webhooks.fulfillments.create.jsx` | POST | Handle shipments | `authenticate.webhook()` |
| `/webhooks.checkouts.create.jsx` | POST | Track abandoned carts | `authenticate.webhook()` |
| `/webhooks.checkouts.update.jsx` | POST | Update cart status | `authenticate.webhook()` |
| `/webhooks.app.uninstalled.jsx` | POST | Handle uninstall | `authenticate.webhook()` |
| `/webhooks.app.scopes_update.jsx` | POST | Handle scope changes | `authenticate.webhook()` |

---

## 🔐 Security Layer

### **Authentication Methods**

```javascript
// 1. Admin Authentication (for embedded app routes)
export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  // admin = GraphQL client
  // session = { shop, accessToken, ... }
};

// 2. Webhook Authentication (for webhook routes)
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  // Validates HMAC signature from Shopify
  // Ensures webhook is legitimate
};

// 3. Public Routes (no authentication)
export const loader = async ({ request }) => {
  // Anyone can access
};
```

---

## 📊 Database Indexes

**Purpose:** Speed up queries

```sql
-- WebhookLog indexes
CREATE INDEX "WebhookLog_shopDomain_topic_idx" ON WebhookLog(shopDomain, topic);
CREATE INDEX "WebhookLog_createdAt_idx" ON WebhookLog(createdAt);

-- MessageLog indexes
CREATE INDEX "MessageLog_shopDomain_messageType_idx" ON MessageLog(shopDomain, messageType);
CREATE INDEX "MessageLog_status_idx" ON MessageLog(status);

-- PendingCart indexes
CREATE INDEX "PendingCart_status_scheduledFor_idx" ON PendingCart(status, scheduledFor);
CREATE INDEX "PendingCart_shopDomain_idx" ON PendingCart(shopDomain);

-- Unique constraints
CREATE UNIQUE INDEX "Store_shopDomain_key" ON Store(shopDomain);
CREATE UNIQUE INDEX "PendingCart_checkoutToken_key" ON PendingCart(checkoutToken);
```

**Why These Indexes:**
- `(shopDomain, topic)` → Fast webhook lookup per shop
- `createdAt` → Time-based queries (e.g., "last 7 days")
- `(status, scheduledFor)` → Find carts to process (WHERE status='pending' AND scheduledFor <= NOW())
- `status` → Count messages by status (sent, failed, pending)

---

## 🚦 Error Handling Strategy

### **Webhook Error Handling**

```javascript
try {
  // Process webhook
  await db.webhookLog.create({ status: "processing" });
  // ... business logic
  await db.webhookLog.update({ status: "completed" });
  return new Response(null, { status: 200 });
} catch (error) {
  // Log error
  await db.webhookLog.create({
    status: "failed",
    errorMessage: error.message
  });
  return new Response(null, { status: 500 });
}
```

**Why:**
- Shopify retries failed webhooks
- Logging helps debug issues
- Always return 200 for processed webhooks (even if business logic fails)

---

## 🔮 Future Enhancements

### **Phase 1: Core Functionality** (Current)
- ✅ Database models
- ✅ Webhook handlers (skeleton)
- ✅ Shopify integration
- 🔲 Wylto API integration

### **Phase 2: Admin UI**
- Settings page (configure Wylto API key)
- Message logs viewer
- Analytics dashboard

### **Phase 3: Advanced Features**
- Scheduled job for cart recovery
- Message templates (customizable)
- A/B testing for messages
- Multi-language support

### **Phase 4: Scale**
- Redis for caching
- PostgreSQL for production
- Background jobs (BullMQ)
- Rate limiting

---

## 📚 Technology Stack Details

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI components |
| | Polaris Web Components | Shopify design system |
| | App Bridge | Embed in Shopify Admin |
| **Routing** | React Router v7 | File-based routing |
| **Backend** | Node.js 20+ | Server runtime |
| | Express (via React Router) | HTTP server |
| **Database** | SQLite (dev) | Local database |
| | Prisma ORM | Type-safe queries |
| **Build** | Vite | Fast bundler |
| **Deployment** | Shopify CLI | Dev tunnel + production |
| **Integration** | Shopify API (GraphQL) | Store data access |
| | Shopify Webhooks | Real-time events |
| | Wylto API (TODO) | WhatsApp messaging |

---

## 🎓 Learning Resources

### **Shopify App Development**
- [Getting Started](https://shopify.dev/docs/apps/getting-started)
- [Webhooks Guide](https://shopify.dev/docs/apps/build/webhooks)
- [App Bridge](https://shopify.dev/docs/api/app-bridge)

### **React Router v7**
- [Official Docs](https://reactrouter.com/)
- [Migration from v6](https://reactrouter.com/start/framework/migration)

### **Prisma**
- [Quickstart](https://www.prisma.io/docs/getting-started)
- [Schema Reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

---

**Document Version:** 1.0
**Last Updated:** December 19, 2025
