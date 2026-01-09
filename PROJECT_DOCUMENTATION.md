# Shopify-Wylto WhatsApp Integration - Project Documentation

## 📋 Project Overview

**Project Name:** Shopify-Wylto WhatsApp Integration
**Purpose:** A Shopify embedded app that integrates with Wylto's WhatsApp API to send automated messages for:
- Order confirmations
- Shipping notifications
- Abandoned cart recovery
- Order status updates

**Tech Stack:**
- **Framework:** React Router v7
- **Runtime:** Node.js (>=20.19)
- **Database:** SQLite (dev) with Prisma ORM
- **Shopify Integration:** @shopify/shopify-app-react-router
- **Frontend:** React 18 with Polaris web components
- **Build Tool:** Vite

---

## 🏗️ Project Structure

```
shopify-wylto-integration/
├── app/                          # Application source code
│   ├── routes/                   # React Router routes
│   │   ├── _index/              # Public landing page
│   │   │   └── route.jsx        # Shop login form
│   │   ├── app._index.jsx       # Main embedded app page
│   │   ├── app.jsx              # App shell/layout
│   │   ├── app.additional.jsx   # Additional app page
│   │   ├── app.test-graphql.jsx # GraphQL testing page
│   │   ├── auth.$.jsx           # OAuth callback handler
│   │   ├── auth.login/          # Login route
│   │   ├── api.test-db.jsx      # Database testing endpoint
│   │   └── webhooks.*.jsx       # Webhook handlers (7 files)
│   ├── db.server.js             # Prisma client singleton
│   ├── shopify.server.js        # Shopify app configuration
│   ├── entry.server.jsx         # Server entry point
│   └── root.jsx                 # Root component
│
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma            # Database models
│   ├── migrations/              # Migration history
│   └── dev.sqlite               # SQLite database (dev)
│
├── public/                       # Static assets
├── extensions/                   # Shopify app extensions (future)
│
├── Configuration Files
├── package.json                 # Dependencies & scripts
├── vite.config.js              # Vite bundler config
├── tsconfig.json               # TypeScript config
├── shopify.app.wyl-store-bnglr.toml  # Shopify app config
├── shopify.app.toml            # Default app config
└── shopify.web.toml            # Web component config
```

---

## 🗄️ Database Schema (Prisma)

### **Models:**

#### 1. **Session** (Shopify OAuth)
Stores Shopify OAuth session data. Managed automatically by `@shopify/shopify-app-session-storage-prisma`.

```prisma
model Session {
  id            String    @id
  shop          String    # e.g., "my-store.myshopify.com"
  accessToken   String    # OAuth access token
  isOnline      Boolean   # Online vs offline token
  scope         String?   # Granted scopes
  expires       DateTime?
  userId        BigInt?
  firstName     String?
  lastName      String?
  email         String?
  // ... other fields
}
```

#### 2. **Store** (Wylto Configuration)
Links each Shopify store to its Wylto account settings.

```prisma
model Store {
  id              String   @id @default(cuid())
  shopDomain      String   @unique  # "my-store.myshopify.com"
  wyltoApiKey     String?           # Wylto API key
  wyltoAccountId  String?           # Wylto account ID
  isActive        Boolean  @default(true)
  installedAt     DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Purpose:** Store Wylto credentials per shop, enable/disable integration.

#### 3. **WebhookLog** (Audit Trail)
Logs all incoming Shopify webhooks for debugging and monitoring.

```prisma
model WebhookLog {
  id           String   @id @default(cuid())
  shopDomain   String
  topic        String   # "orders/create", "fulfillments/create", etc.
  payload      String   # Full JSON payload
  status       String   @default("received")  # received/processing/completed/failed
  errorMessage String?
  createdAt    DateTime @default(now())

  @@index([shopDomain, topic])  # Fast queries by shop+topic
  @@index([createdAt])          # Time-based queries
}
```

**Purpose:** Debug webhooks, track processing, monitor errors.

#### 4. **MessageLog** (WhatsApp Messages)
Tracks all WhatsApp messages sent via Wylto API.

```prisma
model MessageLog {
  id             String    @id @default(cuid())
  shopDomain     String
  recipient      String    # Phone number (masked)
  messageType    String    # "order_confirmation", "shipping_notification", etc.
  referenceId    String?   # Shopify order ID or checkout token
  wyltoMessageId String?   # Message ID from Wylto API
  status         String    @default("pending")  # pending/sent/delivered/failed
  errorMessage   String?
  sentAt         DateTime?
  createdAt      DateTime  @default(now())

  @@index([shopDomain, messageType])
  @@index([status])
}
```

**Purpose:** Track message delivery, link to orders, monitor failures.

#### 5. **PendingCart** (Abandoned Cart Recovery)
Tracks abandoned checkouts for scheduled WhatsApp recovery messages.

```prisma
model PendingCart {
  id            String    @id @default(cuid())
  shopDomain    String
  checkoutToken String    @unique  # Shopify checkout token
  customerPhone String
  customerName  String?
  cartUrl       String    # Recovery URL
  cartTotal     String?   # "₹1,234.00"
  itemCount     Int?
  scheduledFor  DateTime  # When to send recovery message
  status        String    @default("pending")  # pending/sent/converted/expired
  sentAt        DateTime?
  createdAt     DateTime  @default(now())

  @@index([status, scheduledFor])  # Find carts to process
  @@index([shopDomain])
}
```

**Purpose:** Schedule and track abandoned cart recovery campaigns.

---

## 🔌 Key Application Files

### **1. app/shopify.server.js**
**Purpose:** Shopify app initialization and configuration.

**Key Functions:**
- Configures Shopify API connection
- Sets up OAuth flow (`/auth` prefix)
- Registers webhook handlers
- Initializes Prisma session storage

**Important Code:**
```javascript
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.October25,
  scopes: ["read_orders", "read_checkouts", ...],
  sessionStorage: new PrismaSessionStorage(prisma),
  webhooks: {
    APP_UNINSTALLED: { callbackUrl: "/webhooks/app/uninstalled" },
    APP_SCOPES_UPDATE: { callbackUrl: "/webhooks/app/scopes_update" }
  }
});
```

**Exports:**
- `authenticate` - Verify requests from Shopify
- `registerWebhooks` - Register webhooks with Shopify
- `sessionStorage` - Store/retrieve sessions

---

### **2. app/db.server.js**
**Purpose:** Prisma client singleton for database access.

**Key Functions:**
- Creates single Prisma instance in development (prevents hot-reload issues)
- Provides database access to all routes

**Usage:**
```javascript
import db from "../db.server";

await db.webhookLog.create({ ... });
await db.store.findUnique({ where: { shopDomain } });
```

---

### **3. vite.config.js**
**Purpose:** Vite bundler configuration.

**Important Settings:**
- **React Router alias:** Redirects `react-router-dom` → `react-router` (v7 compatibility)
- **HMR config:** Hot module replacement for development
- **Port:** 3000 (or from env PORT)
- **Plugins:** React Router, TypeScript paths

**Key Fix Applied:**
```javascript
resolve: {
  alias: {
    "react-router-dom": "react-router"  // React Router v7 compatibility
  }
}
```

---

## 🛣️ Route System (React Router v7)

### **Public Routes**

#### **/_index/route.jsx**
- **URL:** `/`
- **Purpose:** Public landing page with shop login form
- **Flow:**
  1. User enters shop domain (e.g., `my-store.myshopify.com`)
  2. Submits form → redirects to `/auth/login`
  3. OAuth flow begins

---

### **Authentication Routes**

#### **/auth.$.jsx**
- **URL:** `/auth/*`
- **Purpose:** Handles OAuth callback from Shopify
- **Flow:**
  1. Shopify redirects here after merchant approves app
  2. Exchanges auth code for access token
  3. Stores session in database
  4. Redirects to `/app`

---

### **Embedded App Routes** (Inside Shopify Admin)

#### **/app.jsx**
- **Purpose:** App shell/layout for embedded app
- **Features:** Shopify App Bridge initialization, navigation

#### **/app._index.jsx**
- **URL:** `/app`
- **Purpose:** Main dashboard (currently shows demo product creation)
- **Features:**
  - GraphQL mutation demo (`productCreate`)
  - Polaris web components
  - App Bridge toast notifications

**TODO:** Replace with Wylto settings dashboard

#### **/app.additional.jsx**
- **URL:** `/app/additional`
- **Purpose:** Additional app page (example)

#### **/app.test-graphql.jsx**
- **URL:** `/app/test-graphql`
- **Purpose:** GraphQL API testing page

---

### **API Routes**

#### **/api.test-db.jsx**
- **URL:** `/api/test-db`
- **Purpose:** Test database connection
- **Returns:** JSON with session count

---

### **Webhook Routes** (7 handlers)

All webhook routes use `action` export (POST requests only).

#### **1. /webhooks.app.uninstalled.jsx**
- **Topic:** `app/uninstalled`
- **Purpose:** Clean up when merchant uninstalls app
- **Action:** Deletes all sessions for the shop

#### **2. /webhooks.app.scopes_update.jsx**
- **Topic:** `app/scopes_update`
- **Purpose:** Handle when merchant updates app permissions

#### **3. /webhooks.orders.create.jsx** ⭐ NEW
- **Topic:** `orders/create`
- **Purpose:** New order placed
- **Actions:**
  1. Log webhook to `WebhookLog`
  2. Extract order details (customer phone, order ID, items, total)
  3. Get store's Wylto API key from `Store` table
  4. Send WhatsApp order confirmation via Wylto API
  5. Log message to `MessageLog`
  6. Update webhook status to "completed"

**TODO:** Implement Wylto API call

#### **4. /webhooks.orders.updated.jsx** ⭐ NEW
- **Topic:** `orders/updated`
- **Purpose:** Order status changed (cancelled, refunded, etc.)
- **Actions:** Similar to orders/create, sends status update message

#### **5. /webhooks.fulfillments.create.jsx** ⭐ NEW
- **Topic:** `fulfillments/create`
- **Purpose:** Order shipped
- **Actions:**
  1. Extract tracking number, carrier, customer phone
  2. Send WhatsApp shipping notification
  3. Log to `MessageLog`

**TODO:** Implement Wylto API call

#### **6. /webhooks.checkouts.create.jsx** ⭐ NEW
- **Topic:** `checkouts/create`
- **Purpose:** Customer creates checkout (potential abandoned cart)
- **Actions:**
  1. Log webhook
  2. Extract checkout token, customer phone, cart details
  3. Create `PendingCart` entry with `scheduledFor` = 1 hour later
  4. Mark as "pending" for scheduled processing

**Future:** Scheduled job to process pending carts

#### **7. /webhooks.checkouts.update.jsx** ⭐ NEW
- **Topic:** `checkouts/update`
- **Purpose:** Checkout updated (completed or modified)
- **Actions:**
  1. Check if checkout completed (`completed_at` field)
  2. If completed → Update `PendingCart` status to "converted"
  3. If not completed → Update cart details

---

## 📦 Configuration Files

### **shopify.app.wyl-store-bnglr.toml**
**Purpose:** Shopify app configuration for specific store.

**Key Sections:**
```toml
client_id = "ce16a95a48c256efdaf69d4a96f8e725"  # App client ID
name = "wyl_store_bnglr"

[webhooks]
api_version = "2026-01"

[[webhooks.subscriptions]]  # 7 total webhooks
topics = [ "orders/create" ]
uri = "/webhooks/orders/create"
# ... (7 webhooks defined)

[access_scopes]
scopes = "read_checkouts,read_customers,read_fulfillments,read_orders,read_products"
```

**Webhook Registration:**
- Shopify CLI automatically registers these webhooks when app runs
- Webhooks fire when events occur in the merchant's store

---

### **package.json**
**Key Dependencies:**
- `@shopify/shopify-app-react-router` - Shopify app framework
- `@shopify/app-bridge-react` - Shopify Admin embedding
- `react-router` v7 - Routing framework
- `@prisma/client` - Database ORM
- `react` v18 - UI framework
- `vite` - Build tool

**Scripts:**
```json
{
  "dev": "shopify app dev",           // Start dev server
  "build": "react-router build",      // Build for production
  "start": "react-router-serve ./build/server/index.js",
  "setup": "prisma generate && prisma migrate deploy"
}
```

---

## 🔄 Application Workflow

### **1. App Installation Flow**

```
Merchant → Shopify App Store
    ↓
Click "Install App"
    ↓
Redirected to your landing page (/)
    ↓
Enter shop domain → Submit
    ↓
OAuth flow (/auth/*)
    ↓
Shopify asks: "Grant permissions?"
    ↓
Merchant approves
    ↓
Callback to /auth/* → Exchange code for token
    ↓
Store session in database (Session table)
    ↓
Register webhooks with Shopify
    ↓
Redirect to /app (embedded in Shopify Admin)
```

---

### **2. Order Confirmation Workflow** (Future Implementation)

```
Customer places order on Shopify store
    ↓
Shopify fires "orders/create" webhook
    ↓
POST to https://your-app.com/webhooks/orders/create
    ↓
webhooks.orders.create.jsx handler:
    ↓
1. Log to WebhookLog (status: "processing")
2. Extract: order_id, customer_phone, items, total
3. Query Store table for shop's Wylto API key
4. Call Wylto API:
   POST https://api.wylto.com/send
   {
     "to": "+919876543210",
     "message": "Order #1001 confirmed! Total: ₹1,234",
     "api_key": "shop_wylto_key"
   }
5. Log to MessageLog (status: "sent", wyltoMessageId)
6. Update WebhookLog (status: "completed")
    ↓
Customer receives WhatsApp message
```

---

### **3. Abandoned Cart Recovery Workflow** (Future Implementation)

```
Customer adds items to cart
    ↓
Goes to checkout, enters phone
    ↓
Closes tab without completing
    ↓
Shopify fires "checkouts/create" webhook
    ↓
webhooks.checkouts.create.jsx:
    ↓
1. Create PendingCart entry
   - checkoutToken: "abc123"
   - customerPhone: "+919876543210"
   - scheduledFor: now + 1 hour
   - status: "pending"
    ↓
Scheduled Job (runs every 5 minutes):
    ↓
1. Query PendingCart where:
   - status = "pending"
   - scheduledFor <= NOW()
2. For each cart:
   - Get shop's Wylto API key
   - Send WhatsApp recovery message
   - Update status to "sent", sentAt = NOW()
    ↓
Customer receives: "You left items in cart! Complete checkout: [link]"
    ↓
If customer completes checkout:
    ↓
Shopify fires "checkouts/update" (completed_at set)
    ↓
webhooks.checkouts.update.jsx:
    ↓
Update PendingCart status to "converted"
```

---

## 🔐 Environment Variables

**Required:**
```bash
SHOPIFY_API_KEY=ce16a95a48c256efdaf69d4a96f8e725
SHOPIFY_API_SECRET=your_secret_key
SCOPES=read_checkouts,read_customers,read_fulfillments,read_orders,read_products
SHOPIFY_APP_URL=https://your-cloudflare-url.trycloudflare.com
```

**Optional:**
```bash
PORT=3000
NODE_ENV=development
SHOP_CUSTOM_DOMAIN=custom-domain.com
```

---

## 🚀 Development Commands

### **Start Development Server**
```bash
npm run dev
```
**What happens:**
1. Runs `shopify app dev`
2. Starts Vite dev server (port 3000)
3. Creates Cloudflare tunnel (public URL)
4. Registers webhooks with Shopify
5. Opens Shopify Admin with embedded app

### **Database Commands**
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Validate schema
npx prisma validate
```

### **Build for Production**
```bash
npm run build
npm run start
```

---

## 🧪 Testing Guide

### **Test Webhooks**

**Option 1: Real Events**
1. Go to your dev store admin
2. Create test order → Triggers `orders/create`
3. Fulfill order → Triggers `fulfillments/create`
4. Go to storefront, add to cart, checkout → Triggers `checkouts/create`

**Option 2: Shopify CLI**
```bash
shopify webhook trigger --topic orders/create
shopify webhook trigger --topic checkouts/create
```

**Option 3: Check Logs**
- Terminal: See console.log output
- Prisma Studio: Check `WebhookLog` table
- Shopify Admin: Settings → Notifications → Webhooks → View deliveries

---

## 📊 Database Monitoring

### **Using Prisma Studio**
```bash
npx prisma studio
```
**View:**
- **Session** - Active OAuth sessions
- **WebhookLog** - All received webhooks
- **PendingCart** - Abandoned carts to process
- **MessageLog** - Sent WhatsApp messages (future)

### **Using SQLite CLI**
```bash
sqlite3 prisma/dev.sqlite

# List tables
.tables

# Query webhooks
SELECT * FROM WebhookLog ORDER BY createdAt DESC LIMIT 10;

# Check pending carts
SELECT * FROM PendingCart WHERE status = 'pending';
```

---

## 🔧 Troubleshooting

### **React Router v7 Error (FIXED)**
**Problem:** `No matching export in "react-router/dist/development/index.mjs"`

**Solution:** Added alias in `vite.config.js`:
```javascript
resolve: {
  alias: {
    "react-router-dom": "react-router"
  }
}
```

### **Webhooks Not Firing**
1. Check webhook registration: Shopify Admin → Settings → Notifications → Webhooks
2. Restart dev server: `Ctrl+C`, then `npm run dev`
3. Check Cloudflare tunnel is active

### **Database Errors**
1. Regenerate Prisma client: `npx prisma generate`
2. Reset database: `rm prisma/dev.sqlite`, then `npx prisma migrate dev`

---

## 📝 TODO / Next Steps

### **High Priority**
- [ ] **Implement Wylto API Client**
  - Create `app/services/wylto.server.js`
  - Functions: `sendMessage()`, `getMessageStatus()`

- [ ] **Complete Webhook Handlers**
  - Replace TODO comments with Wylto API calls
  - Add error handling and retry logic

- [ ] **Build Admin UI**
  - Settings page to configure Wylto API key
  - Dashboard to view message logs
  - Abandoned cart recovery settings

- [ ] **Scheduled Jobs**
  - Cron job to process `PendingCart` entries
  - Clean up old webhook logs (> 30 days)

### **Medium Priority**
- [ ] Add message templates (customizable per shop)
- [ ] Add analytics dashboard (messages sent, conversions)
- [ ] Implement rate limiting for Wylto API
- [ ] Add phone number validation

### **Low Priority**
- [ ] Multi-language support
- [ ] Message preview feature
- [ ] Export logs to CSV

---

## 🎯 Key Concepts

### **Embedded Apps**
Your app runs inside Shopify Admin using App Bridge. The UI is embedded in an iframe.

### **OAuth Flow**
Merchants authenticate via OAuth 2.0. Access tokens are stored in `Session` table.

### **Webhooks**
Shopify sends HTTP POST requests to your app when events occur. Your handlers process these asynchronously.

### **Prisma ORM**
Database abstraction layer. Schema defined in `prisma/schema.prisma`, generates type-safe client.

### **React Router v7**
File-based routing. Each file in `app/routes/` becomes a route. Supports loaders (GET) and actions (POST).

---

## 📚 Useful Links

- **Shopify App Dev Docs:** https://shopify.dev/docs/apps
- **React Router Docs:** https://reactrouter.com/
- **Prisma Docs:** https://www.prisma.io/docs
- **App Bridge Docs:** https://shopify.dev/docs/api/app-bridge
- **Webhook Topics:** https://shopify.dev/docs/api/webhooks

---

## 👨‍💻 Author

**Rakesh Kumar M**
Wylto Solutions LLP

---

**Last Updated:** December 19, 2025
