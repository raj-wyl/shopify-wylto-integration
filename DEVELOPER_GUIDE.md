# Developer Guide - Wylto-Shopify Integration

> A comprehensive guide for junior developers to understand and work with this codebase.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure Explained](#project-structure-explained)
3. [Core Concepts](#core-concepts)
4. [Code Walkthrough](#code-walkthrough)
5. [Common Tasks](#common-tasks)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- **Node.js** (v20.19 or higher, or v22.12+)
- **npm** (comes with Node.js)
- **Git** for version control
- **Shopify Partner Account** (for API credentials)
- **Wylto API Token** (from Wylto team)

### Local Development Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd shopify-wylto-integration

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Edit .env with your credentials
# SHOPIFY_API_KEY=your_key
# SHOPIFY_API_SECRET=your_secret
# WYLTO_API_TOKEN=your_token

# 5. Start development server
npm run dev

# Server will start at http://localhost:3000
```

### Understanding the Tech Stack

| Technology | What It Does | Why We Use It |
|-----------|--------------|---------------|
| **React Router 7** | Handles routing and server-side rendering | Modern framework for full-stack React apps |
| **React 18** | UI components | Industry standard for building UIs |
| **Shopify App Framework** | Manages Shopify integration | Official library for Shopify apps |
| **Vite** | Build tool | Fast development and optimized production builds |
| **Cloud Run** | Hosting | Serverless container deployment |

---

## Project Structure Explained

### Directory Layout

```
shopify-wylto-integration/
│
├── app/                          # Main application code
│   ├── entry.server.jsx          # Server entry point (SSR setup)
│   ├── root.jsx                  # Root React component
│   ├── routes.js                 # Route configuration
│   │
│   ├── shopify.server.js         # ⭐ Shopify integration logic
│   ├── wylto-connection.server.js # ⭐ Wylto API client
│   ├── wylto.server.js           # Message templates
│   │
│   └── routes/                   # Route handlers
│       ├── auth.login/           # Login page
│       ├── auth.$.jsx            # OAuth callback
│       ├── app.jsx               # App layout
│       ├── app._index.jsx        # ⭐ Home page
│       ├── app.how-to-use.jsx    # Documentation page
│       └── webhooks.*.jsx        # ⭐ Webhook handlers (10 files)
│
├── public/                       # Static assets (images, fonts)
├── build/                        # Build output (generated)
│
├── shopify.app.toml              # App configuration
├── vite.config.js                # Build configuration
├── package.json                  # Dependencies
└── .env                          # Environment variables (DO NOT COMMIT)
```

### File Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `*.server.js` | `shopify.server.js` | Server-side only code (not bundled for client) |
| `route.jsx` | `auth.login/route.jsx` | Route handler with React component |
| `*.jsx` | `app._index.jsx` | React component file |
| `*.toml` | `shopify.app.toml` | Configuration file |

---

## Core Concepts

### 1. React Router 7 Routing

React Router 7 uses **file-based routing**. The file structure determines the URL structure.

```
app/routes/auth.login/route.jsx  →  /auth/login
app/routes/app._index.jsx        →  /app
app/routes/app.how-to-use.jsx    →  /app/how-to-use
app/routes/webhooks.orders.create.jsx → /webhooks/orders/create
```

#### Route Components

Each route file can export:

```javascript
// Loader - Runs on server before rendering (GET requests)
export async function loader({ request }) {
  // Fetch data needed for the page
  return json({ data: "value" });
}

// Action - Handles form submissions (POST requests)
export async function action({ request }) {
  const formData = await request.formData();
  // Process form data
  return json({ success: true });
}

// Component - Renders the UI
export default function MyPage() {
  const data = useLoaderData(); // Access loader data
  const actionData = useActionData(); // Access action result

  return <div>My Page</div>;
}
```

### 2. Shopify App Authentication

Our app uses **OAuth 2.0** to authenticate with Shopify stores.

**Flow:**
1. Merchant clicks "Install App"
2. Redirected to Shopify to approve permissions
3. Shopify redirects back with authorization code
4. Our app exchanges code for access token
5. Access token stored in session
6. Access token sent to Wylto backend

**Key File:** `app/shopify.server.js`

```javascript
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_orders', 'read_customers', ...],

  hooks: {
    afterAuth: async ({ session }) => {
      // This runs AFTER successful OAuth
      // 1. Register webhooks
      // 2. Save token to Wylto
    }
  }
});
```

### 3. Webhooks

**What are webhooks?**
Webhooks are HTTP callbacks that Shopify sends to our app when specific events occur (e.g., new order, shipment created).

**How they work:**
1. We register webhook URLs with Shopify
2. When event occurs, Shopify sends POST request to our webhook URL
3. We validate the request (HMAC signature)
4. We forward the payload to Wylto backend
5. Wylto sends WhatsApp message to customer

**Security:** Every webhook includes an HMAC signature to prove it came from Shopify.

### 4. Sessions

**What is a session?**
A session stores information about an authenticated Shopify store (shop domain, access token, etc.).

**Current Implementation:**
- **Memory-based** (stored in RAM)
- **Limitation:** Data lost when server restarts
- **Scalability:** Works only with single server instance

**When to upgrade:**
If deploying multiple instances, migrate to Redis or PostgreSQL session storage.

---

## Code Walkthrough

### File 1: `/app/shopify.server.js` (76 lines)

**Purpose:** Central configuration for Shopify integration

```javascript
import "@shopify/shopify-app-react-router/server";
import { shopifyApp } from "@shopify/shopify-app-react-router/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { saveAccessToken } from "./wylto-connection.server";

// Create Shopify app instance
const shopify = shopifyApp({
  // API credentials from environment
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,

  // API version (updates quarterly)
  apiVersion: "2025-10",

  // Permissions our app needs
  scopes: process.env.SCOPES?.split(",") || [],

  // App URL (webhooks sent here)
  appUrl: process.env.SHOPIFY_APP_URL || "",

  // How to store sessions
  sessionStorage: new MemorySessionStorage(),

  // Hooks - callbacks for app lifecycle events
  hooks: {
    afterAuth: async ({ session, admin }) => {
      console.log("✓ OAuth completed for shop:", session.shop);

      // Step 1: Register webhooks
      await registerWebhooks({ session });

      // Step 2: Save access token to Wylto
      const result = await saveAccessToken(
        session.shop,
        session.accessToken
      );

      if (result.success) {
        console.log("✓ Access token saved to Wylto");
      } else {
        console.error("✗ Failed to save token:", result.error);
      }
    }
  }
});

// Register all webhooks with Shopify
export async function registerWebhooks({ session }) {
  const webhooks = [
    { topic: "ORDERS_CREATE", path: "/webhooks/orders/create" },
    { topic: "ORDERS_UPDATED", path: "/webhooks/orders/updated" },
    { topic: "FULFILLMENTS_CREATE", path: "/webhooks/fulfillments/create" },
    { topic: "CHECKOUTS_CREATE", path: "/webhooks/checkouts/create" },
    { topic: "CHECKOUTS_UPDATE", path: "/webhooks/checkouts/update" },
    { topic: "APP_UNINSTALLED", path: "/webhooks/app/uninstalled" },
    { topic: "APP_SCOPES_UPDATE", path: "/webhooks/app/scopes_update" },
    { topic: "CUSTOMERS_DATA_REQUEST", path: "/webhooks/customers/data_request" },
    { topic: "CUSTOMERS_REDACT", path: "/webhooks/customers/redact" },
    { topic: "SHOP_REDACT", path: "/webhooks/shop/redact" }
  ];

  for (const webhook of webhooks) {
    // Register each webhook with Shopify API
    await shopify.registerWebhook({
      session,
      topic: webhook.topic,
      deliveryMethod: "http",
      callbackUrl: `${process.env.SHOPIFY_APP_URL}${webhook.path}`
    });
  }

  console.log("✓ All webhooks registered");
}

// Export authentication utilities
export const { authenticate, login } = shopify;
```

**Key Takeaways:**
- This file creates the core Shopify app configuration
- `afterAuth` hook runs after successful OAuth
- Webhooks are registered automatically on installation
- All Shopify interactions go through the `authenticate` function

---

### File 2: `/app/wylto-connection.server.js` (208 lines)

**Purpose:** Client for communicating with Wylto backend API

```javascript
// Configuration
const WYLTO_API_BASE_URL = process.env.WYLTO_API_BASE_URL || "https://server.wylto.com";
const WYLTO_API_TOKEN = process.env.WYLTO_API_TOKEN;
const WYLTO_API_TIMEOUT = parseInt(process.env.WYLTO_API_TIMEOUT || "30000");
const WYLTO_TEST_MODE = process.env.WYLTO_TEST_MODE === "true";

/**
 * Save Shopify access token to Wylto backend
 * Called during OAuth flow (afterAuth hook)
 *
 * @param {string} shop - Store domain (e.g., "store1.myshopify.com")
 * @param {string} accessToken - Shopify access token
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function saveAccessToken(shop, accessToken) {
  // Test mode - return mock success
  if (WYLTO_TEST_MODE) {
    console.log("[TEST MODE] Skipping saveAccessToken");
    return { success: true, data: { message: "Test mode" } };
  }

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    // Make API call
    const response = await fetch(
      `${WYLTO_API_BASE_URL}/api/shopify/connect`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WYLTO_API_TOKEN}`,
        },
        body: JSON.stringify({ shop, accessToken }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      // Handle different error status codes
      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication failed with Wylto API. Check WYLTO_API_TOKEN."
        };
      }

      return {
        success: false,
        error: data.message || `HTTP ${response.status}`
      };
    }

    console.log("✓ Access token saved for shop:", shop);
    return { success: true, data };

  } catch (error) {
    // Handle network/timeout errors
    if (error.name === "AbortError") {
      console.error("Timeout saving access token for", shop);
      return {
        success: false,
        error: "Request timed out. Wylto API may be unavailable."
      };
    }

    console.error("Error saving access token:", error);
    return {
      success: false,
      error: error.message || "Unknown error"
    };
  }
}

/**
 * Link Shopify store to merchant's Wylto account
 * Called from home page when merchant submits Wylto token
 *
 * @param {string} shop - Store domain
 * @param {string} wyltoToken - Token from Wylto dashboard
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function connectToApp(shop, wyltoToken) {
  if (WYLTO_TEST_MODE) {
    console.log("[TEST MODE] Skipping connectToApp");
    return {
      success: true,
      data: { appName: "Test App", connected: true }
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    const response = await fetch(
      `${WYLTO_API_BASE_URL}/api/shopify/applink`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WYLTO_API_TOKEN}`,
        },
        body: JSON.stringify({ shop, token: wyltoToken }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      // Special handling for "store not found" error
      if (response.status === 404) {
        return {
          success: false,
          error: "Store not found in Wylto. Please reinstall the app or contact support."
        };
      }

      return {
        success: false,
        error: data.message || `Failed to connect (HTTP ${response.status})`
      };
    }

    console.log("✓ Store connected to Wylto app:", data);
    return { success: true, data };

  } catch (error) {
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "Connection timed out. Please try again."
      };
    }

    console.error("Error connecting to app:", error);
    return {
      success: false,
      error: error.message || "Unknown error"
    };
  }
}

/**
 * Check if store is connected to Wylto
 * Called from home page loader to show connection status
 *
 * @param {string} shop - Store domain
 * @returns {Promise<{connected: boolean, data?: any, error?: string}>}
 */
export async function checkConnectionStatus(shop) {
  if (WYLTO_TEST_MODE) {
    console.log("[TEST MODE] Mock connection status");
    return { connected: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    const response = await fetch(
      `${WYLTO_API_BASE_URL}/api/shopify/status?shop=${encodeURIComponent(shop)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${WYLTO_API_TOKEN}`,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // 404 means store not connected (expected)
    if (response.status === 404) {
      return { connected: false };
    }

    if (!response.ok) {
      console.error("Status check failed:", response.status);
      return { connected: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { connected: true, data };

  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Timeout checking status for", shop);
    } else {
      console.error("Error checking status:", error);
    }

    // On error, assume not connected
    return { connected: false, error: error.message };
  }
}
```

**Key Takeaways:**
- Three main functions: `saveAccessToken`, `connectToApp`, `checkConnectionStatus`
- All functions include timeout handling (30 seconds)
- Test mode available for development without API access
- Comprehensive error handling with user-friendly messages

---

### File 3: `/app/routes/app._index.jsx` (195 lines)

**Purpose:** Home page where merchants connect their Wylto account

```javascript
import { useLoaderData, useActionData, Form, useNavigation } from "react-router";
import { json } from "react-router";
import { authenticate } from "../shopify.server";
import {
  saveAccessToken,
  connectToApp,
  checkConnectionStatus,
} from "../wylto-connection.server";

/**
 * Loader - Runs on page load (GET request)
 * Fetches connection status to show appropriate UI
 */
export async function loader({ request }) {
  // Authenticate as admin (requires valid session)
  const { admin } = await authenticate.admin(request);
  const shop = admin.rest.session.shop;

  // Check if store is already connected
  const status = await checkConnectionStatus(shop);

  return json({
    shop,
    isConnected: status.connected,
    appData: status.data || null,
  });
}

/**
 * Action - Handles form submissions (POST request)
 * Two actions: "test" (check status) and "connect" (link account)
 */
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const shop = admin.rest.session.shop;
  const accessToken = admin.rest.session.accessToken;

  const formData = await request.formData();
  const actionType = formData.get("action");

  if (actionType === "test") {
    // Test Connection button
    const status = await checkConnectionStatus(shop);

    return json({
      success: status.connected,
      message: status.connected
        ? "Store is connected!"
        : "Store is not connected yet.",
      appData: status.data,
    });
  }

  if (actionType === "connect") {
    // Connect button
    const wyltoToken = formData.get("wyltoToken");

    if (!wyltoToken) {
      return json({
        success: false,
        message: "Please enter your Wylto token.",
      });
    }

    // Step 1: Ensure access token is saved (safety check)
    const saveResult = await saveAccessToken(shop, accessToken);
    if (!saveResult.success) {
      return json({
        success: false,
        message: `Failed to save access token: ${saveResult.error}`,
      });
    }

    // Step 2: Link to Wylto account
    const connectResult = await connectToApp(shop, wyltoToken);

    if (connectResult.success) {
      return json({
        success: true,
        message: "Successfully connected to Wylto!",
        appData: connectResult.data,
      });
    } else {
      return json({
        success: false,
        message: `Connection failed: ${connectResult.error}`,
      });
    }
  }

  return json({ success: false, message: "Invalid action" });
}

/**
 * Component - UI rendered to the user
 */
export default function AppHome() {
  const { shop, isConnected, appData } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  // Check if form is submitting
  const isLoading = navigation.state === "submitting";

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Welcome to Wylto Integration</h1>
      <p>Shop: <strong>{shop}</strong></p>

      {/* Show connection status */}
      {isConnected ? (
        <div style={{
          background: "#d4edda",
          border: "1px solid #c3e6cb",
          borderRadius: "4px",
          padding: "15px",
          marginBottom: "20px"
        }}>
          <h2 style={{ color: "#155724", margin: "0 0 10px 0" }}>
            ✓ Connected to Wylto
          </h2>
          {appData && (
            <div style={{ color: "#155724" }}>
              <p><strong>App:</strong> {appData.appName}</p>
              <p><strong>Status:</strong> Active</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffeaa7",
          borderRadius: "4px",
          padding: "15px",
          marginBottom: "20px"
        }}>
          <h2 style={{ color: "#856404", margin: "0 0 10px 0" }}>
            Not Connected
          </h2>
          <p style={{ color: "#856404" }}>
            Enter your Wylto token below to connect this store.
          </p>
        </div>
      )}

      {/* Show action result (success/error message) */}
      {actionData && (
        <div style={{
          background: actionData.success ? "#d4edda" : "#f8d7da",
          border: `1px solid ${actionData.success ? "#c3e6cb" : "#f5c6cb"}`,
          borderRadius: "4px",
          padding: "15px",
          marginBottom: "20px",
          color: actionData.success ? "#155724" : "#721c24"
        }}>
          {actionData.message}
        </div>
      )}

      {/* Connection form */}
      {!isConnected && (
        <Form method="post">
          <div style={{ marginBottom: "15px" }}>
            <label htmlFor="wyltoToken" style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold"
            }}>
              Wylto Token:
            </label>
            <input
              type="text"
              id="wyltoToken"
              name="wyltoToken"
              placeholder="Enter your Wylto token"
              required
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="submit"
              name="action"
              value="connect"
              disabled={isLoading}
              style={{
                background: "#16a085",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? "Connecting..." : "Connect"}
            </button>

            <button
              type="submit"
              name="action"
              value="test"
              disabled={isLoading}
              style={{
                background: "#3498db",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1
              }}
            >
              Test Connection
            </button>
          </div>
        </Form>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: "30px",
        padding: "15px",
        background: "#f8f9fa",
        borderRadius: "4px"
      }}>
        <h3>How to get your Wylto token:</h3>
        <ol>
          <li>Log in to your Wylto dashboard</li>
          <li>Navigate to Settings → Integrations</li>
          <li>Copy your Shopify integration token</li>
          <li>Paste it above and click "Connect"</li>
        </ol>
      </div>
    </div>
  );
}
```

**Key Takeaways:**
- `loader` fetches data before rendering (connection status)
- `action` handles form submissions (connect/test buttons)
- UI shows different states based on connection status
- Form uses React Router's `<Form>` component for progressive enhancement
- Loading state prevents double-submissions

---

### File 4: `/app/routes/webhooks.orders.create.jsx` (Webhook Handler Example)

**Purpose:** Handle new order creation webhook from Shopify

```javascript
import { authenticate } from "../shopify.server";

const WYLTO_API_BASE_URL = process.env.WYLTO_API_BASE_URL || "https://server.wylto.com";
const WYLTO_API_TOKEN = process.env.WYLTO_API_TOKEN;

/**
 * Action - Handles webhook POST request
 *
 * Flow:
 * 1. Shopify sends POST with order data + HMAC signature
 * 2. Authenticate validates HMAC
 * 3. Extract shop, payload, topic
 * 4. Forward to Wylto backend
 * 5. Return 200 (success) or 401 (auth failure)
 */
export const action = async ({ request }) => {
  try {
    // Step 1: Authenticate webhook (validates HMAC signature)
    const { shop, payload, topic } = await authenticate.webhook(request);

    // Step 2: Log for debugging
    console.log(`✓ Webhook received: ${topic} for shop: ${shop}`);
    console.log("Order details:", {
      orderId: payload.id,
      orderNumber: payload.order_number,
      customer: payload.customer?.email
    });

    // Step 3: Forward to Wylto backend
    const response = await fetch(
      `${WYLTO_API_BASE_URL}/api/shopify/webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WYLTO_API_TOKEN}`,
        },
        body: JSON.stringify({
          shop,
          topic,
          data: payload,
        }),
      }
    );

    if (!response.ok) {
      console.error(`✗ Wylto API error: HTTP ${response.status}`);
      // Still return 200 to Shopify (we received it)
      // Wylto will handle retry logic if needed
    } else {
      console.log("✓ Webhook forwarded successfully");
    }

    // Step 4: Always return 200 to Shopify
    // If we return error, Shopify will keep retrying
    return new Response(null, { status: 200 });

  } catch (error) {
    console.error("✗ Webhook authentication failed:", error);

    // Return 401 for HMAC validation failures
    // Shopify will retry with correct signature
    return new Response(null, { status: 401 });
  }
};
```

**All 10 webhook handlers follow this exact pattern:**

| File | Webhook Topic | When It Fires |
|------|---------------|---------------|
| `webhooks.orders.create.jsx` | orders/create | New order placed |
| `webhooks.orders.updated.jsx` | orders/updated | Order status changed |
| `webhooks.fulfillments.create.jsx` | fulfillments/create | Order shipped |
| `webhooks.checkouts.create.jsx` | checkouts/create | Checkout started |
| `webhooks.checkouts.update.jsx` | checkouts/update | Checkout updated/completed |
| `webhooks.app.uninstalled.jsx` | app/uninstalled | App removed |
| `webhooks.app.scopes_update.jsx` | app/scopes_update | Permissions changed |
| `webhooks.customers.data_request.jsx` | customers/data_request | GDPR data export request |
| `webhooks.customers.redact.jsx` | customers/redact | GDPR data deletion request |
| `webhooks.shop.redact.jsx` | shop/redact | Store data deletion request |

**Key Takeaways:**
- Webhooks are stateless - no data stored locally
- HMAC validation prevents spoofed requests
- Always return 200 on success, 401 on auth failure
- Wylto backend handles actual message sending

---

## Common Tasks

### Task 1: Adding a New Webhook

**Scenario:** Shopify releases a new webhook type and you need to add it.

**Steps:**

1. **Create webhook handler file**
   ```bash
   # Create new file in app/routes/
   touch app/routes/webhooks.products.create.jsx
   ```

2. **Add handler code** (copy from existing webhook)
   ```javascript
   import { authenticate } from "../shopify.server";

   const WYLTO_API_BASE_URL = process.env.WYLTO_API_BASE_URL || "https://server.wylto.com";
   const WYLTO_API_TOKEN = process.env.WYLTO_API_TOKEN;

   export const action = async ({ request }) => {
     try {
       const { shop, payload, topic } = await authenticate.webhook(request);

       console.log(`Webhook: ${topic} for ${shop}`);

       await fetch(`${WYLTO_API_BASE_URL}/api/shopify/webhook`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${WYLTO_API_TOKEN}`,
         },
         body: JSON.stringify({ shop, topic, data: payload }),
       });

       return new Response(null, { status: 200 });
     } catch (error) {
       console.error("Webhook error:", error);
       return new Response(null, { status: 401 });
     }
   };
   ```

3. **Register webhook in `shopify.server.js`**
   ```javascript
   export async function registerWebhooks({ session }) {
     const webhooks = [
       // ... existing webhooks
       { topic: "PRODUCTS_CREATE", path: "/webhooks/products/create" }, // ADD THIS
     ];

     // ... rest of function
   }
   ```

4. **Test webhook**
   ```bash
   # Use Shopify CLI to trigger test webhook
   shopify app webhook trigger --topic=products/create
   ```

5. **Verify in logs**
   ```bash
   # Check console output
   npm run dev

   # Should see:
   # ✓ Webhook received: products/create for shop: test-store.myshopify.com
   ```

---

### Task 2: Updating Message Templates

**Scenario:** Marketing wants to change the order confirmation message.

**File to edit:** `/app/wylto.server.js`

**Steps:**

1. **Locate template definition**
   ```javascript
   const MESSAGE_TEMPLATES = {
     ORDER_CREATED: {
       name: "Order Confirmation",
       template: `Hi {{customer.first_name}},

   Thank you for your order #{{order.order_number}}!

   Order Details:
   {{#order.line_items}}
   - {{title}} (x{{quantity}}) - {{price}}
   {{/order.line_items}}

   Total: {{order.total_price}} {{order.currency}}

   We'll send you updates as your order ships.`,
       requiredFields: ["customer.first_name", "order.order_number"],
     },
     // ... other templates
   };
   ```

2. **Update template text**
   ```javascript
   ORDER_CREATED: {
     name: "Order Confirmation",
     template: `Hello {{customer.first_name}}! 🎉

   Your order #{{order.order_number}} is confirmed!

   Items:
   {{#order.line_items}}
   ✓ {{title}} x{{quantity}} - {{price}}
   {{/order.line_items}}

   Total: {{order.total_price}} {{order.currency}}

   Track your order: {{order.order_status_url}}

   Questions? Reply to this message!`,
     requiredFields: ["customer.first_name", "order.order_number"],
   },
   ```

3. **Test template rendering**
   ```javascript
   // In browser console or test file
   import { renderTemplate } from "./app/wylto.server.js";

   const message = renderTemplate("ORDER_CREATED", {
     customer: { first_name: "John" },
     order: {
       order_number: "1234",
       line_items: [
         { title: "T-Shirt", quantity: 2, price: "$25" }
       ],
       total_price: "50.00",
       currency: "USD",
       order_status_url: "https://..."
     }
   });

   console.log(message);
   ```

4. **Deploy changes**
   ```bash
   npm run build
   npm run deploy
   ```

**Note:** Template changes only affect **new** messages. Existing webhooks in queue still use old templates.

---

### Task 3: Debugging Webhook Issues

**Scenario:** Webhooks aren't being received or processed correctly.

**Debugging Checklist:**

1. **Check webhook registration**
   ```bash
   # Login to Shopify Partner Dashboard
   # Navigate to: Apps → Your App → API Access → Webhooks
   # Verify all 10 webhooks are listed
   ```

2. **Verify HMAC secret**
   ```bash
   # Check .env file
   echo $SHOPIFY_API_SECRET

   # Must match "API secret key" in Partner Dashboard
   ```

3. **Test webhook manually**
   ```bash
   # Use Shopify CLI
   shopify app webhook trigger --topic=orders/create

   # Check console for:
   # ✓ Webhook received: orders/create for shop: ...
   ```

4. **Check Wylto API response**
   ```javascript
   // Add detailed logging in webhook handler
   const response = await fetch(`${WYLTO_API_BASE_URL}/api/shopify/webhook`, {
     // ... request config
   });

   console.log("Wylto response status:", response.status);
   const responseData = await response.json();
   console.log("Wylto response body:", responseData);
   ```

5. **Verify webhook payload**
   ```javascript
   // Log full payload for inspection
   console.log("Full webhook payload:", JSON.stringify(payload, null, 2));
   ```

6. **Check production logs (Cloud Run)**
   ```bash
   # In Google Cloud Console
   # Navigate to: Cloud Run → wylto-production → Logs
   # Filter by: severity >= ERROR
   # Search for: "Webhook" or shop domain
   ```

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 errors | HMAC validation fails | Verify `SHOPIFY_API_SECRET` matches Partner Dashboard |
| Webhooks not firing | Not registered | Re-run `registerWebhooks()` or reinstall app |
| 404 from Wylto | Store not connected | Merchant must enter Wylto token on home page |
| Timeout errors | Network issues | Check `WYLTO_API_BASE_URL` and firewall rules |

---

## Testing Guide

### Local Testing

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Install ngrok for webhook testing**
   ```bash
   # Install ngrok
   npm install -g ngrok

   # Start tunnel
   ngrok http 3000

   # Update .env with ngrok URL
   SHOPIFY_APP_URL=https://abc123.ngrok.io
   ```

3. **Test OAuth flow**
   - Visit: `http://localhost:3000/auth/login`
   - Enter test store domain
   - Complete OAuth
   - Verify redirect to `/app`

4. **Test connection**
   - Enter test Wylto token
   - Click "Connect"
   - Verify success message

5. **Trigger test webhooks**
   ```bash
   shopify app webhook trigger --topic=orders/create
   shopify app webhook trigger --topic=fulfillments/create
   ```

6. **Check console logs**
   ```
   ✓ Webhook received: orders/create for shop: test-store.myshopify.com
   ✓ Webhook forwarded successfully
   ```

### Unit Testing (Future Enhancement)

Currently, the project doesn't have automated tests. Here's how to add them:

1. **Install testing libraries**
   ```bash
   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
   ```

2. **Create test file** (`app/__tests__/wylto-connection.test.js`)
   ```javascript
   import { describe, it, expect, vi } from 'vitest';
   import { checkConnectionStatus } from '../wylto-connection.server';

   describe('checkConnectionStatus', () => {
     it('returns connected=true for valid shop', async () => {
       // Mock fetch
       global.fetch = vi.fn(() =>
         Promise.resolve({
           ok: true,
           status: 200,
           json: () => Promise.resolve({ appName: 'Test App' }),
         })
       );

       const result = await checkConnectionStatus('test-store.myshopify.com');

       expect(result.connected).toBe(true);
       expect(result.data.appName).toBe('Test App');
     });

     it('returns connected=false for 404 response', async () => {
       global.fetch = vi.fn(() =>
         Promise.resolve({ ok: false, status: 404 })
       );

       const result = await checkConnectionStatus('unconnected-store.myshopify.com');

       expect(result.connected).toBe(false);
     });
   });
   ```

3. **Run tests**
   ```bash
   npm test
   ```

---

## Troubleshooting

### Problem: "Access Denied" when accessing `/app`

**Cause:** Not authenticated or session expired

**Solution:**
1. Clear browser cookies
2. Restart development server: `npm run dev`
3. Re-login: Visit `/auth/login`
4. Complete OAuth flow again

---

### Problem: Webhooks return 401

**Cause:** HMAC signature validation fails

**Solution:**
1. Verify `SHOPIFY_API_SECRET` in `.env` matches Partner Dashboard
2. Check webhook endpoint URL matches registered URL
3. Ensure no proxy/middleware modifying request body
4. Test with Shopify CLI webhook trigger

---

### Problem: "Store not found" when connecting

**Cause:** Access token not saved to Wylto during OAuth

**Solution:**
1. Check `afterAuth` hook logs:
   ```
   ✓ Access token saved to Wylto for shop: ...
   ```
2. If missing, check `WYLTO_API_TOKEN` environment variable
3. Verify Wylto API is accessible from server
4. Reinstall app to trigger `afterAuth` again

---

### Problem: Changes not reflecting in production

**Cause:** Code not deployed or cached

**Solution:**
1. Build project: `npm run build`
2. Deploy: `npm run deploy`
3. Check Cloud Run logs for deployment success
4. Clear browser cache (Ctrl+Shift+R)
5. Verify correct environment in Cloud Run console

---

### Problem: Development server won't start

**Cause:** Port 3000 already in use or dependency issues

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Reinstall dependencies
rm -rf node_modules
npm install

# Start server
npm run dev
```

---

## Next Steps

### For Junior Developers

1. **Explore the codebase**
   - Read `shopify.server.js` thoroughly
   - Understand `authenticate.webhook()` flow
   - Trace a webhook from Shopify → App → Wylto

2. **Make small changes**
   - Update button colors in `app._index.jsx`
   - Add console logs to track flow
   - Modify a message template

3. **Understand React Router**
   - Read official docs: https://reactrouter.com/
   - Learn about loaders and actions
   - Practice form handling

4. **Learn Shopify API**
   - Read Shopify API docs: https://shopify.dev/docs/api
   - Explore available scopes
   - Understand webhook topics

5. **Study webhook payloads**
   - Trigger test webhooks
   - Inspect payload structure
   - Understand available data fields

### Additional Resources

- **Shopify App Development:** https://shopify.dev/docs/apps
- **React Router Guide:** https://reactrouter.com/start/framework
- **Shopify Webhooks:** https://shopify.dev/docs/api/webhooks
- **REST vs GraphQL:** https://shopify.dev/docs/api/usage

---

## Code Style Guidelines

### JavaScript/React Conventions

```javascript
// ✓ Good: Descriptive function names
async function saveAccessToken(shop, token) { }

// ✗ Bad: Unclear abbreviations
async function saveAT(s, t) { }

// ✓ Good: Clear error messages
throw new Error("Failed to save access token: Invalid shop domain");

// ✗ Bad: Vague errors
throw new Error("Error");

// ✓ Good: Early returns for error cases
if (!shop) {
  return { success: false, error: "Shop required" };
}

// ✗ Bad: Nested if statements
if (shop) {
  if (token) {
    // ... logic
  }
}
```

### File Organization

```javascript
// Order of exports in route files:

// 1. Imports
import { json } from "react-router";
import { authenticate } from "../shopify.server";

// 2. Constants
const API_URL = "https://api.example.com";

// 3. Helper functions
function formatShop(shop) { }

// 4. Loader (if route)
export async function loader({ request }) { }

// 5. Action (if route)
export async function action({ request }) { }

// 6. Component (if route)
export default function MyComponent() { }
```

---

## Getting Help

### Internal Resources

1. **Code comments** - Read inline documentation
2. **Console logs** - Check development console
3. **Error messages** - Read carefully, they're descriptive

### External Resources

1. **Shopify Community Forums**
2. **Stack Overflow** (tag: shopify-app)
3. **React Router Discord**
4. **Wylto Support** (for API issues)

### Debugging Tools

- **Browser DevTools** (F12) - Network tab, Console
- **React DevTools** - Component inspector
- **Shopify CLI** - Webhook trigger, logs
- **Postman** - API testing

---

**Document Version:** 1.0
**Last Updated:** 2026-01-25
**For:** Junior Developers & New Team Members
