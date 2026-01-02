/**
 * ============================================================================
 * Wylto Connection API Helpers
 * ============================================================================
 * 
 * This module provides functions to interact with Wylto's Shopify connection APIs:
 * 1. saveAccessToken - Saves Shopify access token after OAuth installation
 * 2. connectToApp - Links store to Wylto app using wyltoToken
 * 3. checkConnectionStatus - Checks current connection status
 * 
 * All functions use the WYLTO_API_TOKEN environment variable for authentication.
 * ============================================================================
 */

import { getStoreByShopDomain } from "./store.server";

const WYLTO_API_BASE_URL = process.env.WYLTO_API_BASE_URL || "https://server.wylto.com";
const WYLTO_API_TOKEN = process.env.WYLTO_API_TOKEN || "";
const WYLTO_TEST_MODE = process.env.WYLTO_TEST_MODE === "true" || false; // Enable test mode without token

/**
 * Saves Shopify access token to Wylto after OAuth installation.
 * 
 * This should be called in the afterAuth hook after successful OAuth.
 * 
 * @param {string} shop - Shopify shop domain (e.g., "example.myshopify.com")
 * @param {string} accessToken - Shopify access token from OAuth session
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function saveAccessToken(shop, accessToken) {
  // Test mode: Return mock success without actual API call
  if (WYLTO_TEST_MODE) {
    console.log(`[TEST MODE] saveAccessToken called for ${shop}`);
    return {
      success: true,
      data: {
        message: "Token saved successfully (TEST MODE)",
        shop: shop,
        testMode: true,
      },
    };
  }

  if (!WYLTO_API_TOKEN) {
    console.warn("WYLTO_API_TOKEN not set, skipping access token save");
    return { success: false, error: "WYLTO_API_TOKEN not configured" };
  }

  if (!shop || !accessToken) {
    return { success: false, error: "Shop and accessToken are required" };
  }

  try {
    const response = await fetch(`${WYLTO_API_BASE_URL}/api/shopify/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WYLTO_API_TOKEN}`,
      },
      body: JSON.stringify({
        shop: shop,
        accessToken: accessToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log("Token saved successfully to Wylto:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to save access token to Wylto:", error);
    return {
      success: false,
      error: error.message || "Failed to save access token",
    };
  }
}

/**
 * Connects store to Wylto app using wyltoToken.
 * 
 * This is called from the frontend when merchant submits their Wylto app token.
 * 
 * @param {string} shop - Shopify shop domain (e.g., "example.myshopify.com")
 * @param {string} wyltoToken - User-provided Wylto app token
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function connectToApp(shop, wyltoToken) {
  // Test mode: Return mock success without actual API call
  if (WYLTO_TEST_MODE) {
    console.log(`[TEST MODE] connectToApp called for ${shop} with token: ${wyltoToken ? '***' + wyltoToken.slice(-4) : 'none'}`);
    return {
      success: true,
      data: {
        message: "App connected successfully (TEST MODE)",
        shop: shop,
        appId: "test_app_12345",
        appName: "Test Wylto App",
        testMode: true,
      },
    };
  }

  if (!WYLTO_API_TOKEN) {
    return { success: false, error: "WYLTO_API_TOKEN not configured" };
  }

  if (!shop || !wyltoToken) {
    return { success: false, error: "Shop and wyltoToken are required" };
  }

  try {
    const response = await fetch(`${WYLTO_API_BASE_URL}/api/shopify/applink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WYLTO_API_TOKEN}`,
      },
      body: JSON.stringify({
        shop: shop,
        wyltoToken: wyltoToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log("App connected to Wylto:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to connect app to Wylto:", error);
    return {
      success: false,
      error: error.message || "Failed to connect app",
    };
  }
}

/**
 * Checks connection status for a store.
 * 
 * This is called from the frontend to check if the store is connected to Wylto.
 * 
 * @param {string} shop - Shopify shop domain (e.g., "example.myshopify.com")
 * @returns {Promise<{connected: boolean, data?: any, error?: string}>}
 */
export async function checkConnectionStatus(shop) {
  // Test mode: Return mock status without actual API call
  // Returns connected: false initially, but true if store has been "connected" in test mode
  if (WYLTO_TEST_MODE) {
    console.log(`[TEST MODE] checkConnectionStatus called for ${shop}`);
    
    // Check if store has been connected (has appId stored from connectToApp)
    const store = await getStoreByShopDomain(shop);
    const isConnected = !!(store?.wyltoApiKey && store?.isActive);
    
    if (isConnected) {
      // Store was "connected" via connectToApp in test mode
      return {
        connected: true,
        data: {
          connected: true,
          appId: store.wyltoApiKey || "test_app_12345",
          appName: store.wyltoAccountId || "Test Wylto App",
          tokenValid: true,
          testMode: true,
        },
      };
    }
    
    // Not connected yet - show connection form
    return {
      connected: false,
      data: {
        connected: false,
        testMode: true,
      },
    };
  }

  if (!WYLTO_API_TOKEN) {
    return { connected: false, error: "WYLTO_API_TOKEN not configured" };
  }

  if (!shop) {
    return { connected: false, error: "Shop is required" };
  }

  try {
    const response = await fetch(
      `${WYLTO_API_BASE_URL}/api/shopify/status?shop=${encodeURIComponent(shop)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WYLTO_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      // If 404, store is not connected (this is expected)
      if (response.status === 404) {
        return { connected: false };
      }
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log("Connection status from Wylto:", data);
    return { connected: true, data };
  } catch (error) {
    console.error("Failed to check connection status:", error);
    return { connected: false, error: error.message || "Failed to check status" };
  }
}

