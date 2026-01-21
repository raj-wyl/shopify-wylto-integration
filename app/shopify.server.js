import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { saveAccessToken } from "./wylto-connection.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new MemorySessionStorage(),
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
    APP_SCOPES_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/scopes_update",
    },
    "orders/create": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/create",
    },
    "orders/updated": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/updated",
    },
    "fulfillments/create": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/fulfillments/create",
    },
    "checkouts/create": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/checkouts/create",
    },
    "checkouts/update": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/checkouts/update",
    },
    // GDPR Compliance webhooks (mandatory for App Store)
    "customers/data_request": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/data_request",
    },
    "customers/redact": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/customers/redact",
    },
    "shop/redact": {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/shop/redact",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      console.log(`[afterAuth] Starting for shop: ${session.shop}`);

      try {
        const webhookRegistrationResult = await shopify.registerWebhooks({ session });
        console.log(`[afterAuth] Webhook registration result:`, JSON.stringify(webhookRegistrationResult, null, 2));
      } catch (error) {
        console.error(`[afterAuth] Webhook registration failed:`, error);
      }

      // Save Shopify access token to Wylto after OAuth installation
      try {
        const result = await saveAccessToken(session.shop, session.accessToken);
        if (result.success) {
          console.log(`[afterAuth] Access token saved to Wylto for ${session.shop}`);
        } else {
          console.warn(`[afterAuth] Failed to save access token to Wylto for ${session.shop}:`, result.error);
        }
      } catch (error) {
        // Don't fail OAuth if Wylto API call fails
        console.error(`[afterAuth] Error saving access token to Wylto for ${session.shop}:`, error);
      }

      console.log(`[afterAuth] Completed for shop: ${session.shop}`);
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;