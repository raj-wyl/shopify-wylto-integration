import { useState, useEffect } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getStoreByShopDomain, updateStoreConfig } from "../store.server";
import { connectToApp, checkConnectionStatus, saveAccessToken } from "../wylto-connection.server";

/**
 * App Home Page - Wylto Account Connection
 * 
 * This page appears after users install the app from the Shopify App Store.
 * It allows users to connect their existing Wylto account or learn about getting one.
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Load current Store configuration
  const store = await getStoreByShopDomain(shopDomain);

  // Check connection status from Wylto
  let connectionStatus = { connected: false };
  try {
    connectionStatus = await checkConnectionStatus(shopDomain);
  } catch (error) {
    console.error("Failed to check connection status:", error);
  }

  return {
    shopDomain,
    hasApiKey: !!store?.wyltoApiKey,
    hasAccountId: !!store?.wyltoAccountId,
    isConfigured: !!(store?.wyltoApiKey && store?.wyltoAccountId && store?.isActive),
    connectionStatus: connectionStatus.connected,
    connectionData: connectionStatus.data || null,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const wyltoToken = formData.get("wyltoToken")?.toString().trim() || "";
  const actionType = formData.get("actionType")?.toString() || "";

  // Test connection action - check status
  if (actionType === "test") {
    try {
      const status = await checkConnectionStatus(shopDomain);
      if (status.connected) {
        return {
          success: true,
          message: "Store is connected to Wylto!",
          connectionData: status.data,
        };
      } else {
        // Show specific error if available, otherwise show generic message
        return {
          success: false,
          error: status.error || "Store is not connected to Wylto. Please connect using your Wylto app token.",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || "Failed to check connection status.",
      };
              }
            }

  // Connect to app action - use applink API
  if (actionType === "connect") {
    if (!wyltoToken) {
      return {
        success: false,
        error: "Wylto app token is required.",
      };
    }

    try {
      // First, ensure store is registered with Wylto (saveAccessToken)
      // This should have happened during OAuth, but if it failed, try again
      console.log(`[Wylto API] Ensuring store ${shopDomain} is registered with Wylto...`);
      const saveResult = await saveAccessToken(shopDomain, session.accessToken);
      if (!saveResult.success) {
        console.warn(`Failed to save access token: ${saveResult.error}`);
        // Continue anyway - might already be registered
      } else {
        console.log(`Store ${shopDomain} registered with Wylto`);
      }

      // Now link the store to Wylto account
      const result = await connectToApp(shopDomain, wyltoToken);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to connect to Wylto app.",
        };
      }

      // Store connection info locally (optional - for reference)
      // The main connection is managed by Wylto server
      try {
        await updateStoreConfig(shopDomain, {
          isActive: true,
          // Store app info if returned
          wyltoApiKey: result.data?.appId || null,
          wyltoAccountId: result.data?.appName || null,
        });
        console.log(`[Database] Updated isActive to true for ${shopDomain}`);
      } catch (dbError) {
        console.error(`[Database] Failed to update isActive:`, dbError);
        // Don't fail the connection if database update fails
        // The connection is still valid on Wylto server
      }

      return {
        success: true,
        message: "Store connected to Wylto successfully!",
        connectionData: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Failed to connect Wylto account.",
      };
    }
  }

  return {
    success: false,
    error: "Invalid action.",
  };
};

export default function WyltoConnection() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const [wyltoToken, setWyltoToken] = useState("");
  const [actionType, setActionType] = useState("");

  const actionData = fetcher.data;
  const isLoading = fetcher.state === "submitting";

  // Show toast notifications for success/error
  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show(actionData.message || "Settings saved successfully!");
      // Reload page data after successful connection
      if (actionData.message?.includes("connected")) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    }
  }, [actionData, shopify]);

  const handleSubmit = (e, type) => {
    e.preventDefault();
    setActionType(type);
    const formData = new FormData();
    formData.append("wyltoToken", wyltoToken);
    formData.append("actionType", type);
    fetcher.submit(formData, { method: "POST" });
  };

  // If already connected, show success message
  if (loaderData.connectionStatus || loaderData.isConfigured) {
  return (
      <s-page heading="Wylto Connected">
        <s-section heading="Wylto Integration">
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="success-subdued"
            marginBlockStart="base"
          >
            <s-text tone="success">
              ✓ Wylto is connected and active for {loaderData.shopDomain}
            </s-text>
          </s-box>
          {loaderData.connectionData && (
            <s-box marginBlockStart="base" padding="base" background="subdued" borderRadius="base">
              <s-text tone="subdued" style={{ fontSize: "0.875rem" }}>
                App ID: {loaderData.connectionData.appId || "N/A"}
                {loaderData.connectionData.appName && ` | App: ${loaderData.connectionData.appName}`}
                {loaderData.connectionData.tokenValid !== undefined && (
                  ` | Token Valid: ${loaderData.connectionData.tokenValid ? "Yes" : "No"}`
                )}
              </s-text>
            </s-box>
          )}
          <s-paragraph marginBlockStart="base">
            Your WhatsApp messages will be sent automatically for orders, fulfillments, and cart recovery.
        </s-paragraph>
      </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Connect Your Wylto Account">
      {/* Top Section: Connect Your Wylto Account */}
      <s-section heading="Connect Your Wylto Account">
        <s-paragraph>
          Enter your Wylto app token to link this Shopify store to your Wylto account and start automating WhatsApp messages for order confirmations, shipping updates, and cart recovery.
        </s-paragraph>

        <s-stack direction="block" gap="base" marginBlockStart="base">
          {/* Wylto App Token Field */}
          <s-box style={{ width: "100%", maxWidth: "100%" }}>
            <s-label for="wyltoToken" style={{ display: "block", marginBottom: "8px" }}>
              Wylto App Token
            </s-label>
            <s-text tone="subdued" style={{ display: "block", marginTop: "0", marginBottom: "16px" }}>
              Find this in your Wylto Dashboard → Apps → Your App → Settings.
            </s-text>
            <input
              id="wyltoToken"
              type="password"
              value={wyltoToken}
              onChange={(e) => setWyltoToken(e.target.value)}
              placeholder="Enter your Wylto app token"
              disabled={isLoading}
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                padding: "0.875rem 1rem",
                marginTop: "0",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                color: "#1f2937",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#16a085"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </s-box>

          {actionData?.error && (
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
              background="critical-subdued"
              marginBlockStart="base"
              >
              <s-text tone="critical">{actionData.error}</s-text>
              </s-box>
          )}

          {actionData?.success && (
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
              background="success-subdued"
              marginBlockStart="base"
              >
              <s-text tone="success">{actionData.message}</s-text>
              {actionData.connectionData && (
                <s-text tone="subdued" style={{ display: "block", marginTop: "8px", fontSize: "0.875rem" }}>
                  App ID: {actionData.connectionData.appId || "N/A"}
                  {actionData.connectionData.appName && ` | App: ${actionData.connectionData.appName}`}
                </s-text>
              )}
              </s-box>
          )}

          <s-stack direction="inline" gap="base" marginBlockStart="base">
            <s-button
              onClick={(e) => handleSubmit(e, "test")}
              disabled={isLoading}
              loading={isLoading && actionType === "test"}
            >
              Check Status
            </s-button>
            <s-button
              onClick={(e) => handleSubmit(e, "connect")}
              disabled={isLoading || !wyltoToken}
              loading={isLoading && actionType === "connect"}
              variant="primary"
            >
              Connect Store
            </s-button>
          </s-stack>
            </s-stack>
      </s-section>

      {/* Bottom Section: Don't have a Wylto account? */}
      <s-section heading="Don't have a Wylto account?" marginBlockStart="base">
        <s-paragraph>
          Wylto provides WhatsApp Business API with automated messaging for Shopify stores. Get started with:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>Automated order confirmations</s-list-item>
          <s-list-item>Real-time shipping notifications</s-list-item>
          <s-list-item>Abandoned cart recovery</s-list-item>
          <s-list-item>100% template compliance</s-list-item>
        </s-unordered-list>
        <a
          href="https://wylto.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", display: "inline-block", marginTop: "1rem" }}
        >
          <s-button
            variant="secondary"
          >
            Get Wylto Account →
          </s-button>
        </a>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
