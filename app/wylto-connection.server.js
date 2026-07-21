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

/**
 * Wylto API Configuration
 */
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
  if (WYLTO_TEST_MODE) {
    console.log(`[TEST MODE] checkConnectionStatus called for ${shop}`);

    // In test mode, always return connected: false (merchant must connect via real API)
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

/**
 * Disconnects (un-links) a store from its Wylto account.
 *
 * This is called from the frontend when the merchant clicks "Disconnect".
 * It removes the applink between the store and the Wylto account WITHOUT
 * uninstalling the Shopify app. After a successful call, checkConnectionStatus
 * should report connected: false.
 *
 * @param {string} shop - Shopify shop domain (e.g., "example.myshopify.com")
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function disconnectFromApp(shop) {
  // Test mode: Return mock success without actual API call
  if (WYLTO_TEST_MODE) {
    console.log(`[TEST MODE] disconnectFromApp called for ${shop}`);
    return {
      success: true,
      data: {
        message: "Store disconnected successfully (TEST MODE)",
        shop: shop,
        testMode: true,
      },
    };
  }

  if (!WYLTO_API_TOKEN) {
    return { success: false, error: "WYLTO_API_TOKEN not configured" };
  }

  if (!shop) {
    return { success: false, error: "Shop is required" };
  }

  let timeoutId;
  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    const apiUrl = `${WYLTO_API_BASE_URL}/api/shopify/appdisconnect`;
    console.log(`[Wylto API] Disconnecting store ${shop} from Wylto app`);
    console.log(`[Wylto API] Calling: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WYLTO_API_TOKEN}`,
      },
      body: JSON.stringify({
        shop: shop,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[Wylto API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      // Store not linked - treat as already disconnected (idempotent success)
      if (response.status === 404) {
        console.log(`[Wylto API] Store ${shop} was not linked (404 - treating as disconnected)`);
        return { success: true, data: { message: "Store is already disconnected." } };
      }
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
    console.log("Store disconnected from Wylto:", data);
    return { success: true, data };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error("Failed to disconnect store from Wylto:", error);

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
      error: error.message || "Failed to disconnect store",
    };
  }
}

/**
 * ============================================================================
 * Embedded feature APIs — templates & automations
 * ============================================================================
 * These power the in-admin Templates and Automations pages. They use the same
 * app-level WYLTO_API_TOKEN Bearer auth as the connection helpers above.
 */

/**
 * Pulls a human-readable message out of an error response.
 *
 * Errors arrive in a few shapes: a plain { error: "..." } string, or — when
 * the failure came from Meta via Wylto — a nested object whose most useful
 * field is error_user_msg (e.g. "This template has too many variables for its
 * length"). Always returns a string, so the UI never tries to render an object.
 *
 * @param {any} data - Parsed response body
 * @param {number} status - HTTP status, used for the fallback message
 * @returns {string}
 */
function extractError(data, status) {
  const err = data?.error;
  if (typeof err === "string" && err) return err;
  if (err && typeof err === "object") {
    return err.error_user_msg || err.error_user_title || err.message || `Wylto API error (${status})`;
  }
  if (typeof data?.message === "string" && data.message) return data.message;
  return `Wylto API error (${status})`;
}

/**
 * Shared request helper for the Wylto Shopify feature APIs. Handles Bearer
 * auth, JSON, a request timeout, and normalises the result into
 * { success, status, data?, error? }.
 *
 * @param {string} path - Path beginning with "/", relative to WYLTO_API_BASE_URL
 * @param {{ method?: string, body?: any }} [options]
 */
async function wyltoRequest(path, { method = "GET", body } = {}) {
  if (!WYLTO_API_TOKEN) {
    return { success: false, status: 0, error: "WYLTO_API_TOKEN not configured" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);
  try {
    console.log(`[Wylto API] ${method} ${path}`);
    const response = await fetch(`${WYLTO_API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WYLTO_API_TOKEN}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let data = null;
    const text = await response.text();
    // Log the raw body so response shapes can be confirmed against the
    // backend without guessing at field names.
    console.log(
      `[Wylto API] ${method} ${path} -> ${response.status} body: ${text ? text.slice(0, 1000) : "(empty)"}`,
    );
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      return { success: false, status: response.status, error: extractError(data, response.status), data };
    }
    return { success: true, status: response.status, data };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return { success: false, status: 0, error: "Request timed out. Please try again." };
    }
    if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED")) {
      return { success: false, status: 0, error: "Cannot reach the Wylto API. Please try again later." };
    }
    return { success: false, status: 0, error: error.message || "Request failed" };
  }
}

/**
 * Lists the WhatsApp templates available to a shop's Wylto account.
 * GET /api/shopify/templates?shop=<shop>
 *
 * @param {string} shop
 * @returns {Promise<{ success: boolean, templates?: any[], error?: string }>}
 */
export async function getTemplates(shop) {
  if (!shop) return { success: false, error: "Shop is required" };
  const res = await wyltoRequest(`/api/shopify/templates?shop=${encodeURIComponent(shop)}`);
  if (!res.success) return { success: false, error: res.error };
  // Backend response shape is being confirmed; accept an array or a
  // { templates: [...] } envelope and normalise to an array.
  const templates = Array.isArray(res.data) ? res.data : res.data?.templates ?? [];
  return { success: true, templates };
}

/**
 * Creates a WhatsApp template for a shop's Wylto account. The template is
 * submitted to Meta for approval and is not usable until approved.
 * POST /api/shopify/templates?shop=<shop>
 *
 * @param {string} shop
 * @param {object} template - { name, language, category, components }
 */
export async function createTemplate(shop, template) {
  if (!shop) return { success: false, error: "Shop is required" };
  return wyltoRequest(`/api/shopify/templates?shop=${encodeURIComponent(shop)}`, {
    method: "POST",
    body: template,
  });
}

/**
 * Reads the shop's current order-status automations.
 * GET /api/shopify/automations?shop=<shop>
 *
 * @param {string} shop
 * @returns {Promise<{ success: boolean, automations?: any[], error?: string }>}
 */
export async function getAutomations(shop) {
  if (!shop) return { success: false, error: "Shop is required" };
  const res = await wyltoRequest(`/api/shopify/automations?shop=${encodeURIComponent(shop)}`);
  if (!res.success) return { success: false, error: res.error };
  const automations = Array.isArray(res.data) ? res.data : res.data?.automations ?? [];
  return { success: true, automations };
}

/**
 * Saves the shop's order-status automations — which template fires for each
 * order status, and whether that automation is enabled.
 * POST /api/shopify/automations
 *
 * @param {string} shop
 * @param {Array<{ status: string, enabled: boolean, templateId?: string }>} automations
 */
export async function saveAutomations(shop, automations) {
  if (!shop) return { success: false, error: "Shop is required" };
  if (!Array.isArray(automations)) return { success: false, error: "automations must be an array" };
  return wyltoRequest(`/api/shopify/automations`, {
    method: "POST",
    body: { shop, automations },
  });
}

