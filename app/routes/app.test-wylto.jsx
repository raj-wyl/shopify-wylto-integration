import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  getStoreByShopDomain,
  getOrCreateStore,
  updateStoreConfig,
} from "../store.server";
import {
  getWyltoConfigForShop,
  getAllTemplateKeys,
  getTemplateInfo,
  renderTemplate,
} from "../wylto.server";

/**
 * ============================================================================
 * Test Route for Wylto Integration (1.1.0 + 1.2.0 + 1.3.0)
 * ============================================================================
 * 
 * This route tests:
 * 1. Store helpers (getStoreByShopDomain, getOrCreateStore, updateStoreConfig)
 * 2. Wylto config loading (getWyltoConfigForShop)
 * 3. Template system (getAllTemplateKeys, getTemplateInfo, renderTemplate)
 * 
 * Access via: /app/test-wylto
 * ============================================================================
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const results = {
    shopDomain,
    tests: {},
    errors: [],
  };

  try {
    // ========================================================================
    // Test 1.1.0 - Store Helpers
    // ========================================================================
    
    // Test 1.1.1: getStoreByShopDomain
    try {
      const store1 = await getStoreByShopDomain(shopDomain);
      results.tests.getStoreByShopDomain = {
        success: true,
        found: store1 !== null,
        data: store1
          ? {
              id: store1.id,
              shopDomain: store1.shopDomain,
              isActive: store1.isActive,
              hasApiKey: !!store1.wyltoApiKey,
              hasAccountId: !!store1.wyltoAccountId,
            }
          : null,
      };
    } catch (error) {
      results.tests.getStoreByShopDomain = {
        success: false,
        error: error.message,
      };
      results.errors.push(`getStoreByShopDomain: ${error.message}`);
    }

    // Test 1.1.2: getOrCreateStore
    try {
      const store2 = await getOrCreateStore(shopDomain);
      results.tests.getOrCreateStore = {
        success: true,
        data: {
          id: store2.id,
          shopDomain: store2.shopDomain,
          isActive: store2.isActive,
          hasApiKey: !!store2.wyltoApiKey,
          hasAccountId: !!store2.wyltoAccountId,
        },
      };
    } catch (error) {
      results.tests.getOrCreateStore = {
        success: false,
        error: error.message,
      };
      results.errors.push(`getOrCreateStore: ${error.message}`);
    }

    // Test 1.1.3: updateStoreConfig (test update with dummy data)
    try {
      const testStore = await updateStoreConfig(shopDomain, {
        isActive: false, // Set to false for testing
      });
      results.tests.updateStoreConfig = {
        success: true,
        data: {
          id: testStore.id,
          shopDomain: testStore.shopDomain,
          isActive: testStore.isActive,
        },
      };
    } catch (error) {
      results.tests.updateStoreConfig = {
        success: false,
        error: error.message,
      };
      results.errors.push(`updateStoreConfig: ${error.message}`);
    }

    // ========================================================================
    // Test 1.2.0 - Wylto Config Loading
    // ========================================================================
    
    // Test 1.2.2: getWyltoConfigForShop
    // This will likely fail if Wylto is not configured, which is expected
    try {
      const wyltoConfig = await getWyltoConfigForShop(shopDomain);
      results.tests.getWyltoConfigForShop = {
        success: true,
        configured: true,
        data: {
          hasApiKey: !!wyltoConfig.apiKey,
          hasAccountId: !!wyltoConfig.accountId,
          isActive: wyltoConfig.isActive,
        },
      };
    } catch (error) {
      // Expected if Wylto is not configured
      results.tests.getWyltoConfigForShop = {
        success: false,
        configured: false,
        error: error.message,
        note: "This is expected if Wylto credentials are not set in settings",
      };
    }

    // ========================================================================
    // Test 1.3.0 - Template System
    // ========================================================================
    
    // Test 1.3.4: getAllTemplateKeys
    try {
      const templateKeys = getAllTemplateKeys();
      results.tests.getAllTemplateKeys = {
        success: true,
        count: templateKeys.length,
        keys: templateKeys,
      };
    } catch (error) {
      results.tests.getAllTemplateKeys = {
        success: false,
        error: error.message,
      };
      results.errors.push(`getAllTemplateKeys: ${error.message}`);
    }

    // Test 1.3.4: getTemplateInfo
    try {
      const templateInfo = getTemplateInfo("ORDER_CREATED");
      results.tests.getTemplateInfo = {
        success: true,
        data: templateInfo,
      };
    } catch (error) {
      results.tests.getTemplateInfo = {
        success: false,
        error: error.message,
      };
      results.errors.push(`getTemplateInfo: ${error.message}`);
    }

    // Test 1.3.3: renderTemplate (with sample data)
    try {
      const sampleData = {
        customerName: "John Doe",
        orderNumber: "1234",
        shopName: "Test Store",
        total: "100.00",
        currency: "USD",
        orderUrl: "https://example.com/order/1234",
      };
      const rendered = renderTemplate("ORDER_CREATED", sampleData);
      results.tests.renderTemplate = {
        success: true,
        templateKey: "ORDER_CREATED",
        sampleData,
        rendered,
      };
    } catch (error) {
      results.tests.renderTemplate = {
        success: false,
        error: error.message,
      };
      results.errors.push(`renderTemplate: ${error.message}`);
    }

    // Test 1.3.3: renderTemplate with conditional blocks
    try {
      const sampleDataWithConditional = {
        customerName: "Jane Doe",
        orderNumber: "5678",
        trackingNumber: "TRACK123",
        carrier: "FedEx",
      };
      const renderedConditional = renderTemplate(
        "ORDER_FULFILLED",
        sampleDataWithConditional
      );
      results.tests.renderTemplateConditional = {
        success: true,
        templateKey: "ORDER_FULFILLED",
        sampleData: sampleDataWithConditional,
        rendered: renderedConditional,
      };
    } catch (error) {
      results.tests.renderTemplateConditional = {
        success: false,
        error: error.message,
      };
      results.errors.push(`renderTemplateConditional: ${error.message}`);
    }
  } catch (error) {
    results.errors.push(`Unexpected error: ${error.message}`);
  }

  return results;
};

export default function TestWylto() {
  const loaderData = useLoaderData();
  const shopify = useAppBridge();

  return (
    <s-page heading="Wylto Integration Test">
      <s-section heading="Test Results Summary">
        <s-paragraph>
          Testing all Wylto integration components (1.1.0, 1.2.0, 1.3.0) for
          shop: <strong>{loaderData.shopDomain}</strong>
        </s-paragraph>

        {loaderData.errors.length > 0 && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="critical-subdued"
            marginBlockStart="base"
          >
            <s-heading level="3">Errors ({loaderData.errors.length})</s-heading>
            <s-unordered-list>
              {loaderData.errors.map((error, idx) => (
                <s-list-item key={idx}>
                  <s-text tone="critical">{error}</s-text>
                </s-list-item>
              ))}
            </s-unordered-list>
          </s-box>
        )}
      </s-section>

      {/* Test 1.1.0 - Store Helpers */}
      <s-section heading="1.1.0 - Store Helpers">
        <s-stack direction="block" gap="base">
          {/* getStoreByShopDomain */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">getStoreByShopDomain</s-heading>
            {loaderData.tests.getStoreByShopDomain?.success ? (
              <div>
                <s-text tone="success">✓ Success</s-text>
                <pre style={{ marginTop: "8px", fontSize: "12px" }}>
                  {JSON.stringify(loaderData.tests.getStoreByShopDomain.data, null, 2)}
                </pre>
              </div>
            ) : (
              <s-text tone="critical">
                ✗ Failed: {loaderData.tests.getStoreByShopDomain?.error}
              </s-text>
            )}
          </s-box>

          {/* getOrCreateStore */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">getOrCreateStore</s-heading>
            {loaderData.tests.getOrCreateStore?.success ? (
              <div>
                <s-text tone="success">✓ Success</s-text>
                <pre style={{ marginTop: "8px", fontSize: "12px" }}>
                  {JSON.stringify(loaderData.tests.getOrCreateStore.data, null, 2)}
                </pre>
              </div>
            ) : (
              <s-text tone="critical">
                ✗ Failed: {loaderData.tests.getOrCreateStore?.error}
              </s-text>
            )}
          </s-box>

          {/* updateStoreConfig */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">updateStoreConfig</s-heading>
            {loaderData.tests.updateStoreConfig?.success ? (
              <div>
                <s-text tone="success">✓ Success</s-text>
                <pre style={{ marginTop: "8px", fontSize: "12px" }}>
                  {JSON.stringify(loaderData.tests.updateStoreConfig.data, null, 2)}
                </pre>
              </div>
            ) : (
              <s-text tone="critical">
                ✗ Failed: {loaderData.tests.updateStoreConfig?.error}
              </s-text>
            )}
          </s-box>
        </s-stack>
      </s-section>

      {/* Test 1.2.0 - Wylto Config */}
      <s-section heading="1.2.0 - Wylto Config Loading">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <s-heading level="3">getWyltoConfigForShop</s-heading>
          {loaderData.tests.getWyltoConfigForShop?.success ? (
            <div>
              <s-text tone="success">✓ Success - Wylto is configured</s-text>
              <pre style={{ marginTop: "8px", fontSize: "12px" }}>
                {JSON.stringify(loaderData.tests.getWyltoConfigForShop.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <s-text tone="subdued">
                ⚠ Not configured (expected if credentials not set)
              </s-text>
              <s-text tone="subdued" style={{ display: "block", marginTop: "4px" }}>
                {loaderData.tests.getWyltoConfigForShop?.error}
              </s-text>
            </div>
          )}
        </s-box>
      </s-section>

      {/* Test 1.3.0 - Template System */}
      <s-section heading="1.3.0 - Template System">
        <s-stack direction="block" gap="base">
          {/* getAllTemplateKeys */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">getAllTemplateKeys</s-heading>
            {loaderData.tests.getAllTemplateKeys?.success ? (
              <div>
                <s-text tone="success">
                  ✓ Success - Found {loaderData.tests.getAllTemplateKeys.count} templates
                </s-text>
                <pre style={{ marginTop: "8px", fontSize: "12px" }}>
                  {JSON.stringify(loaderData.tests.getAllTemplateKeys.keys, null, 2)}
                </pre>
              </div>
            ) : (
              <s-text tone="critical">
                ✗ Failed: {loaderData.tests.getAllTemplateKeys?.error}
              </s-text>
            )}
          </s-box>

          {/* getTemplateInfo */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">getTemplateInfo (ORDER_CREATED)</s-heading>
            {loaderData.tests.getTemplateInfo?.success ? (
              <div>
                <s-text tone="success">✓ Success</s-text>
                <pre style={{ marginTop: "8px", fontSize: "12px" }}>
                  {JSON.stringify(loaderData.tests.getTemplateInfo.data, null, 2)}
                </pre>
              </div>
            ) : (
              <s-text tone="critical">
                ✗ Failed: {loaderData.tests.getTemplateInfo?.error}
              </s-text>
            )}
          </s-box>

          {/* renderTemplate */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">renderTemplate (ORDER_CREATED)</s-heading>
            {loaderData.tests.renderTemplate?.success ? (
              <div>
                <s-text tone="success">✓ Success</s-text>
                <s-text style={{ display: "block", marginTop: "8px", fontWeight: "bold" }}>
                  Sample Data:
                </s-text>
                <pre style={{ marginTop: "4px", fontSize: "12px" }}>
                  {JSON.stringify(loaderData.tests.renderTemplate.sampleData, null, 2)}
                </pre>
                <s-text style={{ display: "block", marginTop: "8px", fontWeight: "bold" }}>
                  Rendered Message:
                </s-text>
                <pre
                  style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    padding: "8px",
                    background: "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  {loaderData.tests.renderTemplate.rendered}
                </pre>
              </div>
            ) : (
              <s-text tone="critical">
                ✗ Failed: {loaderData.tests.renderTemplate?.error}
              </s-text>
            )}
          </s-box>

          {/* renderTemplate with conditional */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-heading level="3">renderTemplate (ORDER_FULFILLED with conditional blocks)</s-heading>
            {loaderData.tests.renderTemplateConditional?.success ? (
              <div>
                <s-text tone="success">✓ Success</s-text>
                <s-text style={{ display: "block", marginTop: "8px", fontWeight: "bold" }}>
                  Sample Data:
                </s-text>
                <pre style={{ marginTop: "4px", fontSize: "12px" }}>
                  {JSON.stringify(loaderData.tests.renderTemplateConditional.sampleData, null, 2)}
                </pre>
                <s-text style={{ display: "block", marginTop: "8px", fontWeight: "bold" }}>
                  Rendered Message (with conditional blocks):
                </s-text>
                <pre
                  style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    padding: "8px",
                    background: "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
                  {loaderData.tests.renderTemplateConditional.rendered}
                </pre>
              </div>
            ) : (
              <s-text tone="critical">
                ✗ Failed: {loaderData.tests.renderTemplateConditional?.error}
              </s-text>
            )}
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

