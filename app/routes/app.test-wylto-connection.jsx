import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  saveAccessToken,
  connectToApp,
  checkConnectionStatus,
} from "../wylto-connection.server";

/**
 * Test Route for Wylto Connection APIs
 * 
 * This route tests the three Wylto connection APIs:
 * 1. saveAccessToken - Saves Shopify access token after OAuth
 * 2. connectToApp - Links store to Wylto app using wyltoToken
 * 3. checkConnectionStatus - Checks current connection status
 * 
 * Access via: /app/test-wylto-connection
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Test checkConnectionStatus
  let statusResult = { connected: false, error: null };
  try {
    statusResult = await checkConnectionStatus(shopDomain);
  } catch (error) {
    statusResult = { connected: false, error: error.message };
  }

  // Check environment variables
  const envCheck = {
    WYLTO_API_TOKEN: {
      set: !!process.env.WYLTO_API_TOKEN,
      length: process.env.WYLTO_API_TOKEN?.length || 0,
      preview: process.env.WYLTO_API_TOKEN 
        ? `${process.env.WYLTO_API_TOKEN.substring(0, 4)}...${process.env.WYLTO_API_TOKEN.slice(-4)}`
        : "Not set",
    },
    WYLTO_API_BASE_URL: {
      set: !!process.env.WYLTO_API_BASE_URL,
      value: process.env.WYLTO_API_BASE_URL || "https://server.wylto.com (default)",
    },
    WYLTO_TEST_MODE: {
      enabled: process.env.WYLTO_TEST_MODE === "true",
      value: process.env.WYLTO_TEST_MODE || "false",
    },
  };

  return {
    shopDomain,
    accessToken: session.accessToken ? "***" + session.accessToken.slice(-4) : "Not available",
    connectionStatus: statusResult,
    envCheck,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType")?.toString() || "";
  const wyltoToken = formData.get("wyltoToken")?.toString().trim() || "";

  if (actionType === "saveToken") {
    // Test saveAccessToken
    try {
      const result = await saveAccessToken(shopDomain, session.accessToken);
      return {
        success: result.success,
        action: "saveToken",
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        action: "saveToken",
        error: error.message,
      };
    }
  }

  if (actionType === "connectApp") {
    // Test connectToApp
    if (!wyltoToken) {
      return {
        success: false,
        action: "connectApp",
        error: "Wylto token is required",
      };
    }
    try {
      const result = await connectToApp(shopDomain, wyltoToken);
      return {
        success: result.success,
        action: "connectApp",
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        action: "connectApp",
        error: error.message,
      };
    }
  }

  if (actionType === "checkStatus") {
    // Test checkConnectionStatus
    try {
      const result = await checkConnectionStatus(shopDomain);
      return {
        success: true,
        action: "checkStatus",
        connected: result.connected,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        action: "checkStatus",
        error: error.message,
      };
    }
  }

  return {
    success: false,
    error: "Invalid action type",
  };
};

export default function TestWyltoConnection() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [wyltoToken, setWyltoToken] = useState("");

  const actionData = fetcher.data;
  const isLoading = fetcher.state === "submitting";

  return (
    <s-page heading="Wylto Connection API Test">
      <s-section heading="Test Wylto Connection APIs">
        <s-paragraph>
          Test the three Wylto connection APIs for shop: <strong>{loaderData.shopDomain}</strong>
        </s-paragraph>

        {/* Current Status */}
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
          marginBlockStart="base"
        >
          <s-heading level="3">Current Connection Status</s-heading>
          <s-text>
            Connected: {loaderData.connectionStatus.connected ? "Yes" : "No"}
          </s-text>
          {loaderData.connectionStatus.data && (
            <pre style={{ marginTop: "8px", fontSize: "12px", overflow: "auto" }}>
              {JSON.stringify(loaderData.connectionStatus.data, null, 2)}
            </pre>
          )}
          {loaderData.connectionStatus.error && (
            <s-text tone="critical" style={{ display: "block", marginTop: "8px" }}>
              Error: {loaderData.connectionStatus.error}
            </s-text>
          )}
        </s-box>

        {/* Test Results */}
        {actionData && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background={actionData.success ? "success-subdued" : "critical-subdued"}
            marginBlockStart="base"
          >
            <s-heading level="3">
              Test Result: {actionData.action}
            </s-heading>
            {actionData.success ? (
              <s-text tone="success">✓ Success</s-text>
            ) : (
              <s-text tone="critical">✗ Failed</s-text>
            )}
            {actionData.data && (
              <pre style={{ marginTop: "8px", fontSize: "12px", overflow: "auto" }}>
                {JSON.stringify(actionData.data, null, 2)}
              </pre>
            )}
            {actionData.error && (
              <s-text tone="critical" style={{ display: "block", marginTop: "8px" }}>
                Error: {actionData.error}
              </s-text>
            )}
            {actionData.connected !== undefined && (
              <s-text style={{ display: "block", marginTop: "8px" }}>
                Connected: {actionData.connected ? "Yes" : "No"}
              </s-text>
            )}
          </s-box>
        )}

        {/* Test Actions */}
        <s-stack direction="block" gap="base" marginBlockStart="base">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">1. Save Access Token</s-heading>
            <s-paragraph>
              Test saving Shopify access token to Wylto (runs automatically after OAuth).
            </s-paragraph>
            <s-text tone="subdued" style={{ fontSize: "0.875rem" }}>
              Access Token: {loaderData.accessToken}
            </s-text>
            <s-button
              onClick={() => {
                const formData = new FormData();
                formData.append("actionType", "saveToken");
                fetcher.submit(formData, { method: "POST" });
              }}
              disabled={isLoading}
              loading={isLoading && actionData?.action === "saveToken"}
              marginBlockStart="base"
            >
              Test Save Access Token
            </s-button>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">2. Connect Store to App</s-heading>
            <s-paragraph>
              Test connecting store to Wylto app using wyltoToken.
            </s-paragraph>
            <input
              type="text"
              value={wyltoToken}
              onChange={(e) => setWyltoToken(e.target.value)}
              placeholder="Enter Wylto app token"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.5rem",
                marginTop: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
              }}
            />
            <s-button
              onClick={() => {
                const formData = new FormData();
                formData.append("actionType", "connectApp");
                formData.append("wyltoToken", wyltoToken);
                fetcher.submit(formData, { method: "POST" });
              }}
              disabled={isLoading || !wyltoToken}
              loading={isLoading && actionData?.action === "connectApp"}
              marginBlockStart="base"
            >
              Test Connect to App
            </s-button>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">3. Check Connection Status</s-heading>
            <s-paragraph>
              Test checking connection status for the store.
            </s-paragraph>
            <s-button
              onClick={() => {
                const formData = new FormData();
                formData.append("actionType", "checkStatus");
                fetcher.submit(formData, { method: "POST" });
              }}
              disabled={isLoading}
              loading={isLoading && actionData?.action === "checkStatus"}
              marginBlockStart="base"
            >
              Test Check Status
            </s-button>
          </s-box>
        </s-stack>

        {/* Environment Info */}
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background={loaderData.envCheck.WYLTO_API_TOKEN.set ? "success-subdued" : "critical-subdued"}
          marginBlockStart="base"
        >
          <s-heading level="3">Environment Configuration</s-heading>
          
          <s-stack direction="block" gap="small" marginBlockStart="base">
            <s-box>
              <s-text style={{ fontWeight: "bold" }}>
                WYLTO_API_TOKEN: {loaderData.envCheck.WYLTO_API_TOKEN.set ? "✅ Set" : "❌ Not Set"}
              </s-text>
              {loaderData.envCheck.WYLTO_API_TOKEN.set ? (
                <s-text tone="subdued" style={{ fontSize: "0.875rem", display: "block", marginTop: "4px" }}>
                  Preview: {loaderData.envCheck.WYLTO_API_TOKEN.preview}
                  <br />
                  Length: {loaderData.envCheck.WYLTO_API_TOKEN.length} characters
                </s-text>
              ) : (
                <s-text tone="critical" style={{ fontSize: "0.875rem", display: "block", marginTop: "4px" }}>
                  ⚠️ This variable is REQUIRED for Wylto connection APIs to work.
                  <br />
                  Set it in your .env file or environment variables.
                </s-text>
              )}
            </s-box>

            <s-box>
              <s-text style={{ fontWeight: "bold" }}>
                WYLTO_API_BASE_URL: {loaderData.envCheck.WYLTO_API_BASE_URL.set ? "✅ Custom" : "✅ Default"}
              </s-text>
              <s-text tone="subdued" style={{ fontSize: "0.875rem", display: "block", marginTop: "4px" }}>
                {loaderData.envCheck.WYLTO_API_BASE_URL.value}
              </s-text>
            </s-box>

            <s-box>
              <s-text style={{ fontWeight: "bold" }}>
                WYLTO_TEST_MODE: {loaderData.envCheck.WYLTO_TEST_MODE.enabled ? "✅ Enabled" : "❌ Disabled"}
              </s-text>
              <s-text tone="subdued" style={{ fontSize: "0.875rem", display: "block", marginTop: "4px" }}>
                {loaderData.envCheck.WYLTO_TEST_MODE.enabled 
                  ? "Test mode active - APIs will return mock responses without actual API calls"
                  : "Set WYLTO_TEST_MODE=true in .env to enable test mode (no token required)"}
              </s-text>
            </s-box>
          </s-stack>

          {!loaderData.envCheck.WYLTO_API_TOKEN.set && (
            <s-box marginBlockStart="base" padding="base" background="subdued" borderRadius="base">
              <s-heading level="4">How to Set WYLTO_API_TOKEN:</s-heading>
              <s-unordered-list>
                <s-list-item>
                  <strong>Option 1:</strong> Create a <code>.env</code> file in project root:
                  <pre style={{ marginTop: "4px", fontSize: "0.75rem", padding: "4px", background: "#f5f5f5" }}>
                    WYLTO_API_TOKEN=your_api_token_here
                  </pre>
                </s-list-item>
                <s-list-item>
                  <strong>Option 2:</strong> Export in terminal:
                  <pre style={{ marginTop: "4px", fontSize: "0.75rem", padding: "4px", background: "#f5f5f5" }}>
                    export WYLTO_API_TOKEN=your_api_token_here
                  </pre>
                </s-list-item>
                <s-list-item>
                  <strong>Note:</strong> Restart your dev server after setting the variable
                </s-list-item>
              </s-unordered-list>
            </s-box>
          )}
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

