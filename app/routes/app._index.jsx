import { useState, useEffect } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { connectToApp, checkConnectionStatus, saveAccessToken, disconnectFromApp } from "../wylto-connection.server";

/**
 * App Home Page - Wylto Account Connection
 *
 * This page appears after users install the app from the Shopify App Store.
 * It allows users to connect their existing Wylto account or learn about getting one.
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Check connection status from Wylto backend
  let connectionStatus = { connected: false };
  try {
    connectionStatus = await checkConnectionStatus(shopDomain);
  } catch (error) {
    console.error("Failed to check connection status:", error);
  }

  return {
    shopDomain,
    isConnected: connectionStatus.connected,
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

  // Disconnect action - un-link store from Wylto account (keeps app installed)
  if (actionType === "disconnect") {
    try {
      const result = await disconnectFromApp(shopDomain);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to disconnect from Wylto.",
        };
      }

      return {
        success: true,
        message: "Store disconnected from Wylto successfully!",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Failed to disconnect from Wylto.",
      };
    }
  }

  return {
    success: false,
    error: "Invalid action.",
  };
};

const BRAND_DEEP = "#0e3b29";
const BRAND_ACCENT = "#3cb45a";

const FEATURES = [
  {
    icon: "🧾",
    title: "Order Confirmation",
    desc: "A WhatsApp confirmation goes out as soon as a customer places an order.",
  },
  {
    icon: "🚚",
    title: "Shipping & Delivery",
    desc: "Customers are kept posted when an order is fulfilled, shipped, and delivered.",
  },
  {
    icon: "🛒",
    title: "Abandoned Cart Recovery",
    desc: "Shoppers who leave items behind get a friendly nudge with a link back to their cart.",
  },
  {
    icon: "💵",
    title: "COD Confirmation",
    desc: "Cash-on-delivery orders are confirmed over WhatsApp before they ship.",
  },
];

/* eslint-disable react/prop-types -- local presentational helpers */

/** Wylto wordmark with the brand dot. */
function Wordmark({ size = 20, color = "#ffffff" }) {
  return (
    <span
      style={{
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.02em",
        color,
        whiteSpace: "nowrap",
      }}
    >
      Wylto
      <span
        style={{
          display: "inline-block",
          width: "0.17em",
          height: "0.17em",
          borderRadius: "50%",
          background: BRAND_ACCENT,
          marginLeft: "0.05em",
        }}
      />
    </span>
  );
}

function Hero({ connected, shopDomain }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${BRAND_DEEP} 0%, #14523a 100%)`,
        borderRadius: "14px",
        padding: "22px 24px",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <div>
        <Wordmark size={22} />
        <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "8px", letterSpacing: "-0.01em" }}>
          WhatsApp automation for your Shopify store
        </div>
        <div style={{ fontSize: "13.5px", opacity: 0.8, marginTop: "4px" }}>
          {connected
            ? `Sending automatic order updates for ${shopDomain}`
            : "Connect your Wylto account to start sending automatic order updates."}
        </div>
      </div>
      <div
        style={{
          background: connected ? BRAND_ACCENT : "rgba(255,255,255,0.16)",
          color: "#ffffff",
          borderRadius: "999px",
          padding: "6px 14px",
          fontSize: "12.5px",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {connected ? "● Connected" : "Not connected"}
      </div>
    </div>
  );
}

function FeatureGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "12px",
      }}
    >
      {FEATURES.map((f) => (
        <div
          key={f.title}
          style={{
            border: "1px solid #e3e3e3",
            borderRadius: "12px",
            padding: "16px",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: "22px", lineHeight: 1, marginBottom: "10px" }}>{f.icon}</div>
          <div style={{ fontWeight: 650, fontSize: "13.5px", color: "#1a1a1a", marginBottom: "5px" }}>
            {f.title}
          </div>
          <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "#616161" }}>{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

/* eslint-enable react/prop-types */

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
      // Reload page data after a successful connect or disconnect so the
      // loader re-runs and the UI reflects the new connection state.
      const msg = actionData.message?.toLowerCase() || "";
      if (msg.includes("connected") || msg.includes("disconnected")) {
        setTimeout(() => {
          fetcher.load("/app");
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
  if (loaderData.isConnected) {
  return (
      <s-page heading="Wylto">
        <s-section>
          <Hero connected shopDomain={loaderData.shopDomain} />
        </s-section>

        <s-section heading="Connection">
          {loaderData.connectionData && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
              {[
                ["Account", loaderData.connectionData.appName || "—"],
                ["App ID", loaderData.connectionData.appId || "—"],
                [
                  "Token",
                  loaderData.connectionData.tokenValid === undefined
                    ? "—"
                    : loaderData.connectionData.tokenValid
                      ? "Valid"
                      : "Invalid",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    border: "1px solid #e3e3e3",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#8a8a8a", fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "13px", color: "#1a1a1a", fontWeight: 600, marginTop: "2px" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}
          <s-paragraph>
            Your WhatsApp messages will be sent automatically for orders, fulfillments, and cart recovery.
            Manage your templates and automation flows in your Wylto Dashboard.
        </s-paragraph>

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

          <s-stack direction="inline" gap="base" marginBlockStart="base">
            <a
              href={
                loaderData.connectionData?.appId
                  ? `https://app.wylto.com/app/${loaderData.connectionData.appId}/settings`
                  : "https://app.wylto.com"
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <s-button variant="primary">
                Open Wylto Dashboard →
              </s-button>
            </a>
            <s-button
              onClick={(e) => handleSubmit(e, "disconnect")}
              disabled={isLoading}
              loading={isLoading && actionType === "disconnect"}
              variant="secondary"
              tone="critical"
            >
              Disconnect
            </s-button>
          </s-stack>
      </s-section>

        <s-section heading="What's running">
          <FeatureGrid />
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Wylto">
      <s-section>
        <Hero connected={false} shopDomain={loaderData.shopDomain} />
      </s-section>

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
              Find this in your Wylto Dashboard → Settings → API Settings.
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
                borderRadius: "10px",
                fontSize: "0.9375rem",
                color: "#1f2937",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = BRAND_ACCENT;
                e.target.style.boxShadow = `0 0 0 3px ${BRAND_ACCENT}22`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
            />
            <div style={{ marginTop: "10px" }}>
              <a
                href="https://app.wylto.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "13px", color: "#1f7a52", fontWeight: 600, textDecoration: "none" }}
              >
                Get your API token →
              </a>
            </div>
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

      {/* What you get once connected */}
      <s-section heading="What you get once connected" marginBlockStart="base">
        <FeatureGrid />
      </s-section>

      {/* Bottom Section: Don't have a Wylto account? */}
      <s-section heading="Don't have a Wylto account?" marginBlockStart="base">
        <s-paragraph>
          Wylto provides the WhatsApp Business API with automated messaging for Shopify stores.
          Create an account to get your app token and start sending order updates.
        </s-paragraph>
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
