import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getStoreByShopDomain, updateStoreConfig } from "../store.server";

/**
 * ============================================================================
 * 1.4.0 - Wylto Settings Page
 * ============================================================================
 * 
 * This page allows merchants to:
 * - Configure Wylto API credentials (API Key, Account ID)
 * - Enable/disable Wylto integration
 * - View connection status
 * 
 * Components:
 * 1.4.1: Loader - Fetches current Store configuration
 * 1.4.2: Action - Saves Wylto credentials and settings
 * 1.4.3: UI - Form with fields and status display
 * ============================================================================
 */

// ============================================================================
// 1.4.1 - Loader: Fetch Current Store Configuration
// ============================================================================
// Purpose: Loads current Wylto settings from Store table for display
// Used by: Page component to show current values in form fields
// ============================================================================

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Load current Store configuration
  // Uses: getStoreByShopDomain() from store.server.js (1.1.2)
  const store = await getStoreByShopDomain(shopDomain);

  return {
    shopDomain,
    wyltoApiKey: store?.wyltoApiKey || "",
    wyltoAccountId: store?.wyltoAccountId || "",
    isActive: store?.isActive || false,
    // Don't send actual API key in response for security (mask it)
    hasApiKey: !!store?.wyltoApiKey,
    hasAccountId: !!store?.wyltoAccountId,
  };
};

// ============================================================================
// 1.4.2 - Action: Save Wylto Configuration
// ============================================================================
// Purpose: Handles form submission to save Wylto credentials
// Used by: Form submission via useFetcher
// Validates: Ensures API key and Account ID are provided if enabling
// Updates: Store table via updateStoreConfig() (1.1.4)
// ============================================================================

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const wyltoApiKey = formData.get("wyltoApiKey")?.toString().trim() || "";
  const wyltoAccountId = formData.get("wyltoAccountId")?.toString().trim() || "";
  const isActive = formData.get("isActive") === "true";

  // Validation: If enabling Wylto, both API key and Account ID must be provided
  if (isActive) {
    if (!wyltoApiKey) {
      return {
        success: false,
        error: "Wylto API Key is required when enabling Wylto integration.",
      };
    }
    if (!wyltoAccountId) {
      return {
        success: false,
        error: "Wylto Account ID is required when enabling Wylto integration.",
      };
    }
  }

  try {
    // Update Store configuration
    // Uses: updateStoreConfig() from store.server.js (1.1.4)
    await updateStoreConfig(shopDomain, {
      wyltoApiKey: wyltoApiKey || null,
      wyltoAccountId: wyltoAccountId || null,
      isActive,
    });

    return {
      success: true,
      message: "Wylto settings saved successfully!",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to save Wylto settings.",
    };
  }
};

// ============================================================================
// 1.4.3 - UI Component: Wylto Settings Form
// ============================================================================
// Purpose: Displays form for merchants to configure Wylto
// Features:
//   - Form fields for API Key and Account ID
//   - Toggle switch to enable/disable Wylto
//   - Connection status display
//   - Success/error toast notifications
// ============================================================================

export default function WyltoSettings() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  // Form state
  const [wyltoApiKey, setWyltoApiKey] = useState(loaderData.wyltoApiKey || "");
  const [wyltoAccountId, setWyltoAccountId] = useState(
    loaderData.wyltoAccountId || ""
  );
  const [isActive, setIsActive] = useState(loaderData.isActive);

  // Update form when loader data changes
  useEffect(() => {
    setWyltoApiKey(loaderData.wyltoApiKey || "");
    setWyltoAccountId(loaderData.wyltoAccountId || "");
    setIsActive(loaderData.isActive);
  }, [loaderData]);

  // Show toast notifications for success/error
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message || "Settings saved successfully!");
    } else if (fetcher.data?.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.data, shopify]);

  const isLoading = fetcher.state === "submitting";
  const isConfigured =
    loaderData.hasApiKey && loaderData.hasAccountId && loaderData.isActive;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("wyltoApiKey", wyltoApiKey);
    formData.append("wyltoAccountId", wyltoAccountId);
    formData.append("isActive", isActive.toString());
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="Wylto Settings">
      <s-section heading="Wylto Integration Configuration">
        <s-paragraph>
          Configure your Wylto credentials to enable WhatsApp messaging for your
          store. You can find your API Key and Account ID in your Wylto dashboard.
        </s-paragraph>

        {/* Connection Status */}
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background={isConfigured ? "success-subdued" : "subdued"}
          marginBlockStart="base"
        >
          <s-heading level="3">Connection Status</s-heading>
          {isConfigured ? (
            <s-text tone="success">
              ✓ Wylto is connected and active for {loaderData.shopDomain}
            </s-text>
          ) : (
            <s-text tone="subdued">
              ⚠ Wylto is not configured or disabled. Please add your credentials
              below and enable the integration.
            </s-text>
          )}
        </s-box>

        {/* Settings Form */}
        <form onSubmit={handleSubmit}>
          <s-stack direction="block" gap="base" marginBlockStart="base">
            {/* Wylto API Key Field */}
            <s-box>
              <s-label for="wyltoApiKey">
                Wylto API Key <s-text tone="critical">*</s-text>
              </s-label>
              <s-text tone="subdued" style={{ display: "block", marginTop: "4px" }}>
                Your Wylto API key for authentication
              </s-text>
              <input
                id="wyltoApiKey"
                name="wyltoApiKey"
                type="password"
                value={wyltoApiKey}
                onChange={(e) => setWyltoApiKey(e.target.value)}
                disabled={isLoading}
                required={isActive}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                placeholder={
                  loaderData.hasApiKey
                    ? "••••••••••••••••"
                    : "Enter your Wylto API Key"
                }
              />
            </s-box>

            {/* Wylto Account ID Field */}
            <s-box>
              <s-label for="wyltoAccountId">
                Wylto Account ID <s-text tone="critical">*</s-text>
              </s-label>
              <s-text tone="subdued" style={{ display: "block", marginTop: "4px" }}>
                Your Wylto account identifier
              </s-text>
              <input
                id="wyltoAccountId"
                name="wyltoAccountId"
                type="text"
                value={wyltoAccountId}
                onChange={(e) => setWyltoAccountId(e.target.value)}
                disabled={isLoading}
                required={isActive}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginTop: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                placeholder={
                  loaderData.hasAccountId
                    ? "Account ID configured"
                    : "Enter your Wylto Account ID"
                }
              />
            </s-box>

            {/* Enable Wylto Toggle */}
            <s-box>
              <s-stack direction="inline" gap="base" align="center">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isLoading}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <s-label for="isActive" style={{ margin: 0, cursor: "pointer" }}>
                  Enable Wylto integration for this store
                </s-label>
              </s-stack>
              <s-text tone="subdued" style={{ display: "block", marginTop: "4px" }}>
                When enabled, WhatsApp messages will be sent automatically for
                orders, fulfillments, and cart recovery.
              </s-text>
            </s-box>

            {/* Submit Button */}
            <s-box marginBlockStart="base">
              <s-button type="submit" loading={isLoading} variant="primary">
                Save Settings
              </s-button>
            </s-box>
          </s-stack>
        </form>
      </s-section>

      {/* Help Section */}
      <s-section slot="aside" heading="Need Help?">
        <s-paragraph>
          <s-text>To get your Wylto credentials:</s-text>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            Log in to your Wylto dashboard
          </s-list-item>
          <s-list-item>
            Navigate to API Settings or Account Settings
          </s-list-item>
          <s-list-item>
            Copy your API Key and Account ID
          </s-list-item>
          <s-list-item>
            Paste them in the fields above and enable the integration
          </s-list-item>
        </s-unordered-list>
        <s-paragraph marginBlockStart="base">
          <s-text tone="subdued">
            Once configured, the app will automatically send WhatsApp messages for:
          </s-text>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>New orders</s-list-item>
          <s-list-item>Order fulfillments</s-list-item>
          <s-list-item>Order updates</s-list-item>
          <s-list-item>Abandoned cart recovery</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

