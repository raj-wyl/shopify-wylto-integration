# How to Verify Registered Webhooks

## Method 1: Shopify Admin UI (Easiest) ⭐

### Option A: Via App Settings
1. Go to your store admin: **https://wylto-test-store.myshopify.com/admin**
2. Click **Settings** (bottom left corner)
3. Click **Apps and sales channels**
4. Find and click **Wylto Support** (your app)
5. Click **View app listing** or **App configuration**
6. Look for **Webhooks** section

### Option B: Via Notifications Settings
1. Go to your store admin: **https://wylto-test-store.myshopify.com/admin**
2. Click **Settings** (bottom left corner)
3. Click **Notifications**
4. Scroll down to **Webhooks** section
5. You should see a list of all registered webhooks

---

## Method 2: Shopify GraphiQL Explorer

1. Go to: **https://shopify.dev/docs/apps/tools/graphiql-admin-api**
2. Click **"Authenticate with your store"**
3. Enter your store: `wylto-test-store.myshopify.com`
4. Paste this query:

```graphql
query {
  webhookSubscriptions(first: 50) {
    edges {
      node {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
        createdAt
        updatedAt
      }
    }
  }
}
```

5. Click **Run** (▶️ button)
6. You should see all 7 registered webhooks in the response

---

## Method 3: Using Shopify CLI

Run this command in your project directory:

```bash
shopify app env show
```

Then visit your app's webhooks page in the Partner Dashboard:
1. Go to: **https://partners.shopify.com**
2. Click on your app **Wylto Support**
3. Go to **Configuration** tab
4. Scroll to **Webhooks** section

---

## Expected Webhooks (7 total)

You should see these webhooks registered:

✅ **APP_UNINSTALLED**
   - Endpoint: `https://wylto-shopify-266803453994.asia-south1.run.app/webhooks/app/uninstalled`

✅ **APP_SCOPES_UPDATE**
   - Endpoint: `https://wylto-shopify-266803453994.asia-south1.run.app/webhooks/app/scopes_update`

✅ **ORDERS_CREATE** (written as `orders/create` in config)
   - Endpoint: `https://wylto-shopify-266803453994.asia-south1.run.app/webhooks/orders/create`

✅ **ORDERS_UPDATED** (written as `orders/updated` in config)
   - Endpoint: `https://wylto-shopify-266803453994.asia-south1.run.app/webhooks/orders/updated`

✅ **FULFILLMENTS_CREATE** (written as `fulfillments/create` in config)
   - Endpoint: `https://wylto-shopify-266803453994.asia-south1.run.app/webhooks/fulfillments/create`

✅ **CHECKOUTS_CREATE** (written as `checkouts/create` in config)
   - Endpoint: `https://wylto-shopify-266803453994.asia-south1.run.app/webhooks/checkouts/create`

✅ **CHECKOUTS_UPDATE** (written as `checkouts/update` in config)
   - Endpoint: `https://wylto-shopify-266803453994.asia-south1.run.app/webhooks/checkouts/update`

---

## Screenshot Guide

When you check in Shopify Admin, you should see a table similar to this:

```
Topic                    Endpoint                                          Status
-------------------------------------------------------------------------------------
APP_UNINSTALLED         /webhooks/app/uninstalled                         Active
APP_SCOPES_UPDATE       /webhooks/app/scopes_update                       Active
ORDERS_CREATE           /webhooks/orders/create                           Active
ORDERS_UPDATED          /webhooks/orders/updated                          Active
FULFILLMENTS_CREATE     /webhooks/fulfillments/create                     Active
CHECKOUTS_CREATE        /webhooks/checkouts/create                        Active
CHECKOUTS_UPDATE        /webhooks/checkouts/update                        Active
```

All should show **"Active"** or **"Enabled"** status.

---

## Troubleshooting

If you don't see all webhooks:
1. The app might need to be reinstalled
2. Run the installation flow again to trigger webhook registration
3. Check the Cloud Run logs for any registration errors

## Quick Test

To test if webhooks are working:
1. Create a test order in your store
2. Check Cloud Run logs: `gcloud run services logs tail wylto-shopify --region asia-south1`
3. You should see `ORDERS_CREATE` webhook received

---

**Note**: The deprecation warning for `callbackUrl` in the logs is a Shopify SDK issue and does not affect functionality. All webhooks are working correctly.
