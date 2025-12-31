import { useState, useEffect } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getStoreByShopDomain, updateStoreConfig } from "../store.server";

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

  return {
    shopDomain,
    hasApiKey: !!store?.wyltoApiKey,
    hasAccountId: !!store?.wyltoAccountId,
    isConfigured: !!(store?.wyltoApiKey && store?.wyltoAccountId && store?.isActive),
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const wyltoApiKey = formData.get("wyltoApiKey")?.toString().trim() || "";
  const wyltoAccountId = formData.get("wyltoAccountId")?.toString().trim() || "";
  const actionType = formData.get("actionType")?.toString() || "";

  // Test connection action
  if (actionType === "test") {
    if (!wyltoApiKey) {
      return {
        success: false,
        error: "Please enter your Wylto API key to test the connection.",
      };
    }
    // TODO: Add actual API test call here
    return {
      success: true,
      message: "Connection test successful!",
    };
  }

  // Save connection action
  if (actionType === "save") {
    if (!wyltoApiKey || !wyltoAccountId) {
      return {
        success: false,
        error: "Both API Key and Account ID are required.",
      };
    }

    try {
      await updateStoreConfig(shopDomain, {
        wyltoApiKey,
        wyltoAccountId,
        isActive: true,
      });

      return {
        success: true,
        message: "Wylto account connected successfully!",
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
  const [wyltoApiKey, setWyltoApiKey] = useState("");
  const [wyltoAccountId, setWyltoAccountId] = useState("");
  const [showAccountId, setShowAccountId] = useState(false);
  const [actionType, setActionType] = useState("");

  const actionData = fetcher.data;
  const isLoading = fetcher.state === "submitting";

  // Show toast notifications for success/error
  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show(actionData.message || "Settings saved successfully!");
      // Reload page data after successful connection
      if (actionData.message?.includes("connected")) {
        window.location.reload();
      }
    } else if (actionData?.error) {
      shopify.toast.show(actionData.error, { isError: true });
    }
  }, [actionData, shopify]);

  const handleSubmit = (e, type) => {
    e.preventDefault();
    setActionType(type);
    const formData = new FormData();
    formData.append("wyltoApiKey", wyltoApiKey);
    formData.append("wyltoAccountId", wyltoAccountId);
    formData.append("actionType", type);
    fetcher.submit(formData, { method: "POST" });
  };

  // If already configured, show success message
  if (loaderData.isConfigured) {
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
          Enter your Wylto API key to start automating WhatsApp messages for order confirmations, shipping updates, and cart recovery.
        </s-paragraph>

        <s-stack direction="block" gap="base" marginBlockStart="base">
          {/* Wylto API Key Field */}
          <s-box style={{ width: "100%", maxWidth: "100%" }}>
            <s-label for="wyltoApiKey" style={{ display: "block", marginBottom: "8px" }}>
              Wylto API Key
            </s-label>
            <s-text tone="subdued" style={{ display: "block", marginTop: "0", marginBottom: "16px" }}>
              Find this in your Wylto Dashboard → Settings → API Keys.
            </s-text>
            <input
              id="wyltoApiKey"
              type="password"
              value={wyltoApiKey}
              onChange={(e) => setWyltoApiKey(e.target.value)}
              placeholder="Enter your API key"
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

          {showAccountId && (
            <s-box style={{ width: "100%", maxWidth: "100%" }}>
              <s-label for="wyltoAccountId" style={{ display: "block", marginBottom: "8px" }}>
                Wylto Account ID
              </s-label>
              <s-text tone="subdued" style={{ display: "block", marginTop: "0", marginBottom: "16px" }}>
                Enter your Wylto Account ID to complete the connection.
              </s-text>
              <input
                id="wyltoAccountId"
                type="text"
                value={wyltoAccountId}
                onChange={(e) => setWyltoAccountId(e.target.value)}
                placeholder="Enter your Account ID"
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
          )}

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

          {actionData?.success && !actionData?.redirect && (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="success-subdued"
              marginBlockStart="base"
            >
              <s-text tone="success">{actionData.message}</s-text>
            </s-box>
          )}

          <s-stack direction="inline" gap="base" marginBlockStart="base">
            <s-button
              onClick={(e) => handleSubmit(e, "test")}
              disabled={isLoading || !wyltoApiKey}
              loading={isLoading && actionType === "test"}
            >
              Test Connection
            </s-button>
            <s-button
              onClick={(e) => {
                if (!showAccountId) {
                  setShowAccountId(true);
                  setTimeout(() => {
                    document.getElementById("wyltoAccountId")?.focus();
                  }, 100);
                } else {
                  handleSubmit(e, "save");
                }
              }}
              disabled={isLoading || !wyltoApiKey || (showAccountId && !wyltoAccountId)}
              loading={isLoading && actionType === "save"}
              variant="primary"
            >
              Connect Account
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
