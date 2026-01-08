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
const WYLTO_API_TIMEOUT = parseInt(process.env.WYLTO_API_TIMEOUT || "30000", 10); // 30 seconds default

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

  let timeoutId;
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    const apiUrl = `${WYLTO_API_BASE_URL}/api/shopify/connect`;
    console.log(`[Wylto API] Saving access token for ${shop}`);
    console.log(`[Wylto API] Calling: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WYLTO_API_TOKEN}`,
      },
      body: JSON.stringify({
        shop: shop,
        accessToken: accessToken,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[Wylto API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Handle authentication errors (401 Unauthorized)
      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication failed. The WYLTO_API_TOKEN is invalid, expired, or doesn't have the required permissions. Please verify your API token with the Wylto backend team.",
        };
      }
      // Handle timeout/gateway errors
      if (response.status === 504 || response.status === 503) {
        return {
          success: false,
          error: "Wylto API server is temporarily unavailable. Please try again later.",
        };
      }
      const errorText = await response.text();
      // Try to parse HTML error pages and extract meaningful message
      if (errorText.includes("<!DOCTYPE html>") || errorText.includes("<html>")) {
        return {
          success: false,
          error: `Wylto API server error (${response.status}). The server may be down or unreachable.`,
        };
      }
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log("Token saved successfully to Wylto:", data);
    return { success: true, data };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error("Failed to save access token to Wylto:", error);
    
    // Handle timeout/abort errors
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return {
        success: false,
        error: "Request timed out. The Wylto API server may be slow or unreachable. Please try again later.",
      };
    }
    
    // Handle network errors
    if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
      return {
        success: false,
        error: "Cannot connect to Wylto API server. Please check your network connection or try again later.",
      };
    }
    
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

  let timeoutId;
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    const apiUrl = `${WYLTO_API_BASE_URL}/api/shopify/applink`;
    console.log(`[Wylto API] Connecting store ${shop} to Wylto app`);
    console.log(`[Wylto API] Calling: ${apiUrl}`);
    console.log(`[Wylto API] Token length: ${WYLTO_API_TOKEN?.length || 0}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WYLTO_API_TOKEN}`,
      },
      body: JSON.stringify({
        shop: shop,
        wyltoToken: wyltoToken,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[Wylto API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Handle authentication errors (401 Unauthorized)
      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication failed. The WYLTO_API_TOKEN is invalid, expired, or doesn't have the required permissions. Please verify your API token with the Wylto backend team.",
        };
      }
      // Handle timeout/gateway errors
      if (response.status === 504 || response.status === 503) {
        return {
          success: false,
          error: "Wylto API server is temporarily unavailable. Please try again later.",
        };
      }
      
      // Handle 404 - Store not found (needs to be registered first)
      if (response.status === 404) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch (e) {
          // Not JSON, use text as-is
        }
        
        if (errorMessage.includes("Store not found") || errorMessage.includes("install the app first")) {
          return {
            success: false,
            error: "Store not registered with Wylto. The store needs to be registered first via saveAccessToken (which happens automatically during OAuth installation). Please reinstall the app or contact support.",
          };
        }
      }
      
      const errorText = await response.text();
      // Try to parse HTML error pages and extract meaningful message
      if (errorText.includes("<!DOCTYPE html>") || errorText.includes("<html>")) {
        return {
          success: false,
          error: `Wylto API server error (${response.status}). The server may be down or unreachable.`,
        };
      }
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log("App connected to Wylto:", data);
    return { success: true, data };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error("Failed to connect app to Wylto:", error);
    
    // Handle timeout/abort errors
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return {
        success: false,
        error: "Request timed out. The Wylto API server may be slow or unreachable. Please try again later.",
      };
    }
    
    // Handle network errors
    if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
      return {
        success: false,
        error: "Cannot connect to Wylto API server. Please check your network connection or try again later.",
      };
    }
    
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

  let timeoutId;
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    const apiUrl = `${WYLTO_API_BASE_URL}/api/shopify/status?shop=${encodeURIComponent(shop)}`;
    console.log(`[Wylto API] Checking connection status for ${shop}`);
    console.log(`[Wylto API] Calling: ${apiUrl}`);
    console.log(`[Wylto API] Token length: ${WYLTO_API_TOKEN?.length || 0}`);
    console.log(`[Wylto API] Token starts with: ${WYLTO_API_TOKEN?.substring(0, 10) || 'none'}...`);
    console.log(`[Wylto API] Token ends with: ...${WYLTO_API_TOKEN?.substring(WYLTO_API_TOKEN.length - 10) || 'none'}`);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WYLTO_API_TOKEN}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[Wylto API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // If 404, store is not connected (this is expected)
      if (response.status === 404) {
        console.log(`[Wylto API] Store ${shop} is not connected (404 - expected)`);
        return { connected: false };
      }
      
      // Handle authentication errors (401 Unauthorized)
      if (response.status === 401) {
        return {
          connected: false,
          error: "Authentication failed. The WYLTO_API_TOKEN is invalid, expired, or doesn't have the required permissions. Please verify your API token with the Wylto backend team.",
        };
      }
      
      // Handle timeout/gateway errors
      if (response.status === 504 || response.status === 503) {
        return {
          connected: false,
          error: "Wylto API server is temporarily unavailable. Please try again later.",
        };
      }
      
      const errorText = await response.text();
      // Try to parse HTML error pages and extract meaningful message
      if (errorText.includes("<!DOCTYPE html>") || errorText.includes("<html>")) {
        return {
          connected: false,
          error: `Wylto API server error (${response.status}). The server may be down or unreachable.`,
        };
      }
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log("Connection status from Wylto:", data);
    // Use the connected field from API response, default to false if not present
    const isConnected = data.connected === true;
    return { connected: isConnected, data };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error("Failed to check connection status:", error);
    
    // Handle timeout/abort errors
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return {
        connected: false,
        error: "Request timed out. The Wylto API server may be slow or unreachable. Please try again later.",
      };
    }
    
    // Handle network errors
    if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
      return {
        connected: false,
        error: "Cannot connect to Wylto API server. Please check your network connection or try again later.",
      };
    }
    
    return { connected: false, error: error.message || "Failed to check status" };
  }
}

