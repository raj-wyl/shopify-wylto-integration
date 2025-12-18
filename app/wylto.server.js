import { getStoreByShopDomain } from "./store.server";
import prisma from "./db.server";

/**
 * ============================================================================
 * 1.2.0 - Wylto API Client Module
 * ============================================================================
 * 
 * This module provides the core integration with Wylto's WhatsApp API.
 * It handles:
 * - Loading Wylto credentials from the Store table
 * - Sending WhatsApp messages via Wylto API
 * - Logging all message attempts to MessageLog table
 * 
 * Main entry point: sendWhatsAppMessage()
 * ============================================================================
 */

// ============================================================================
// 1.2.1 - Configuration Constants
// ============================================================================
// Purpose: Central place for Wylto API endpoint and settings
// Used by: sendWhatsAppMessage() when making HTTP requests
// ============================================================================

/**
 * Base URL for Wylto API.
 * TODO: Replace with actual Wylto API endpoint when available.
 * This can also be moved to environment variable if needed.
 */
const WYLTO_API_BASE_URL =
  process.env.WYLTO_API_BASE_URL || "https://api.wylto.com";

/**
 * Default timeout for Wylto API requests (in milliseconds).
 * Used by: sendWhatsAppMessage() to prevent hanging requests
 */
const WYLTO_API_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// 1.2.2 - Wylto Config Loader & Validator
// ============================================================================
// Purpose: Loads Wylto credentials from Store table and validates they exist
// Used by: sendWhatsAppMessage() before attempting to send any message
// Returns: { apiKey, accountId, isActive } or throws error if not configured
// ============================================================================

/**
 * Loads and validates Wylto configuration for a given shop.
 * 
 * What this function does:
 * 1. Calls getStoreByShopDomain() to fetch Store record from database
 * 2. Checks if Store record exists
 * 3. Validates that wyltoApiKey and wyltoAccountId are present
 * 4. Checks if Wylto is enabled (isActive === true)
 * 5. Returns config object if valid, throws error if not configured
 * 
 * @param {string} shopDomain - The myshopify domain for the shop
 * @returns {Promise<{apiKey: string, accountId: string, isActive: boolean}>}
 * @throws {Error} If Store not found, credentials missing, or Wylto disabled
 */
export async function getWyltoConfigForShop(shopDomain) {
  if (!shopDomain) {
    throw new Error("shopDomain is required to load Wylto configuration");
  }

  // Step 1: Load Store record from database
  // Uses: getStoreByShopDomain() from store.server.js (1.1.2)
  const store = await getStoreByShopDomain(shopDomain);

  // Step 2: Check if Store record exists
  if (!store) {
    throw new Error(
      `Wylto not configured for shop ${shopDomain}. Please configure Wylto settings in the app.`
    );
  }

  // Step 3: Validate that Wylto API key is present
  if (!store.wyltoApiKey) {
    throw new Error(
      `Wylto API key not configured for shop ${shopDomain}. Please add your Wylto API key in settings.`
    );
  }

  // Step 4: Validate that Wylto Account ID is present
  if (!store.wyltoAccountId) {
    throw new Error(
      `Wylto Account ID not configured for shop ${shopDomain}. Please add your Wylto Account ID in settings.`
    );
  }

  // Step 5: Check if Wylto is enabled for this shop
  if (!store.isActive) {
    throw new Error(
      `Wylto is disabled for shop ${shopDomain}. Please enable Wylto in settings.`
    );
  }

  // Step 6: Return validated configuration
  return {
    apiKey: store.wyltoApiKey,
    accountId: store.wyltoAccountId,
    isActive: store.isActive,
  };
}

// ============================================================================
// 1.3.0 - Expanded Template System
// ============================================================================
// Purpose: Comprehensive template registry with validation and rendering
// Used by: renderTemplate() and validateTemplateData() to process messages
// Features:
//   - Multiple templates for different event types
//   - Required/optional field validation
//   - Graceful handling of missing placeholders
//   - Template metadata (description, example usage)
// ============================================================================

/**
 * ============================================================================
 * 1.3.1 - Template Registry with Metadata
 * ============================================================================
 * Purpose: Stores all message templates with their structure and requirements
 * Used by: renderTemplate(), validateTemplateData(), getTemplateInfo()
 * 
 * Each template contains:
 *   - messageType: Unique identifier (e.g., "ORDER_CREATED")
 *   - description: Human-readable description of when this template is used
 *   - textTemplate: Message text with {{placeholders}}
 *   - requiredFields: Array of placeholder names that MUST be provided
 *   - optionalFields: Array of placeholder names that can be omitted
 * ============================================================================
 */
const TEMPLATES = {
  ORDER_CREATED: {
    messageType: "ORDER_CREATED",
    description: "Sent when a new order is created",
    textTemplate:
      "Hi {{customerName}}, thanks for your order #{{orderNumber}} from {{shopName}}. Your total is {{total}}{{currency}}. Order details: {{orderUrl}}",
    requiredFields: ["customerName", "orderNumber", "shopName", "total"],
    optionalFields: ["currency", "orderUrl"],
  },
  ORDER_FULFILLED: {
    messageType: "ORDER_FULFILLED",
    description: "Sent when an order is fulfilled/shipped",
    textTemplate:
      "Hi {{customerName}}, your order #{{orderNumber}} has been shipped!{{#trackingNumber}} Tracking number: {{trackingNumber}}{{/trackingNumber}}{{#carrier}} Carrier: {{carrier}}{{/carrier}}",
    requiredFields: ["customerName", "orderNumber"],
    optionalFields: ["trackingNumber", "carrier"],
  },
  ORDER_CANCELLED: {
    messageType: "ORDER_CANCELLED",
    description: "Sent when an order is cancelled",
    textTemplate:
      "Hi {{customerName}}, your order #{{orderNumber}} from {{shopName}} has been cancelled.{{#refundAmount}} Refund amount: {{refundAmount}}{{currency}}{{/refundAmount}}",
    requiredFields: ["customerName", "orderNumber", "shopName"],
    optionalFields: ["refundAmount", "currency"],
  },
  ORDER_UPDATED: {
    messageType: "ORDER_UPDATED",
    description: "Sent when an order status is updated",
    textTemplate:
      "Hi {{customerName}}, your order #{{orderNumber}} status has been updated to: {{orderStatus}}.",
    requiredFields: ["customerName", "orderNumber", "orderStatus"],
    optionalFields: [],
  },
  CART_RECOVERY: {
    messageType: "CART_RECOVERY",
    description: "Sent for abandoned cart recovery",
    textTemplate:
      "Hi {{customerName}}, you left items in your cart at {{shopName}}! Complete your purchase: {{cartUrl}}{{#itemCount}} ({{itemCount}} items){{/itemCount}}{{#cartTotal}} Total: {{cartTotal}}{{/cartTotal}}",
    requiredFields: ["customerName", "shopName", "cartUrl"],
    optionalFields: ["itemCount", "cartTotal"],
  },
};

/**
 * ============================================================================
 * 1.3.2 - Template Validation Helper
 * ============================================================================
 * Purpose: Validates that all required fields are present before rendering
 * Used by: renderTemplate() before processing template
 * Returns: { valid: boolean, missingFields: string[] }
 * ============================================================================
 */

/**
 * Validates that all required template fields are present in the data.
 * 
 * What this function does:
 * 1. Looks up template by templateKey
 * 2. Checks if all requiredFields exist in data object
 * 3. Returns validation result with list of missing fields
 * 
 * @param {string} templateKey - Template key like "ORDER_CREATED"
 * @param {Object} data - Data object to validate
 * @returns {{valid: boolean, missingFields: string[]}}
 */
function validateTemplateData(templateKey, data = {}) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    return { valid: false, missingFields: [], error: `Template not found: ${templateKey}` };
  }

  const missingFields = template.requiredFields.filter(
    (field) => !data[field] || data[field] === ""
  );

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * ============================================================================
 * 1.3.3 - Enhanced Template Renderer
 * ============================================================================
 * Purpose: Renders templates with improved placeholder handling
 * Used by: sendWhatsAppMessage() to generate message text
 * Features:
 *   - Validates required fields before rendering
 *   - Handles missing optional fields gracefully
 *   - Supports conditional blocks {{#field}}...{{/field}}
 *   - Cleans up extra whitespace
 * ============================================================================
 */

/**
 * Renders a template by replacing placeholders with actual data.
 * 
 * What this function does:
 * 1. Validates template exists and required fields are present
 * 2. Replaces simple placeholders {{field}} with data values
 * 3. Processes conditional blocks {{#field}}...{{/field}} (only renders if field exists)
 * 4. Cleans up extra whitespace and empty lines
 * 5. Returns rendered message text
 * 
 * @param {string} templateKey - Key like "ORDER_CREATED"
 * @param {Object} data - Object with values like {customerName: "John", orderNumber: "1234"}
 * @returns {string} Rendered message text
 * @throws {Error} If template not found or required fields missing
 */
export function renderTemplate(templateKey, data = {}) {
  // Step 1: Look up template
  const template = TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  // Step 2: Validate required fields
  // Uses: validateTemplateData() (1.3.2)
  const validation = validateTemplateData(templateKey, data);
  if (!validation.valid) {
    throw new Error(
      `Missing required fields for template ${templateKey}: ${validation.missingFields.join(", ")}`
    );
  }

  // Step 3: Start with template text
  let rendered = template.textTemplate;

  // Step 4: Process conditional blocks {{#field}}...{{/field}}
  // These blocks only render if the field exists and is not empty
  const conditionalBlockRegex = /\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs;
  rendered = rendered.replace(conditionalBlockRegex, (match, fieldName, blockContent) => {
    if (data[fieldName] && data[fieldName] !== "") {
      return blockContent;
    }
    return ""; // Remove block if field is missing or empty
  });

  // Step 5: Replace simple placeholders {{field}} with data values
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    // Use empty string if value is null/undefined, otherwise convert to string
    const replacement = value != null ? String(value) : "";
    rendered = rendered.replace(placeholder, replacement);
  }

  // Step 6: Clean up extra whitespace
  // Remove multiple spaces, trim lines, remove empty lines
  rendered = rendered
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  // Step 7: Return rendered message
  return rendered;
}

/**
 * ============================================================================
 * 1.3.4 - Template Info Helper
 * ============================================================================
 * Purpose: Provides metadata about templates (for debugging, UI, etc.)
 * Used by: Future settings UI, debugging tools
 * Returns: Template metadata including description, required/optional fields
 * ============================================================================
 */

/**
 * Gets information about a template.
 * 
 * What this function does:
 * 1. Looks up template by templateKey
 * 2. Returns metadata: description, requiredFields, optionalFields
 * 
 * @param {string} templateKey - Template key like "ORDER_CREATED"
 * @returns {{messageType: string, description: string, requiredFields: string[], optionalFields: string[]} | null}
 */
export function getTemplateInfo(templateKey) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    return null;
  }

  return {
    messageType: template.messageType,
    description: template.description,
    requiredFields: template.requiredFields,
    optionalFields: template.optionalFields,
  };
}

/**
 * Gets all available template keys.
 * 
 * What this function does:
 * 1. Returns array of all template keys (e.g., ["ORDER_CREATED", "ORDER_FULFILLED"])
 * 
 * @returns {string[]} Array of template keys
 */
export function getAllTemplateKeys() {
  return Object.keys(TEMPLATES);
}

// ============================================================================
// 1.2.4 - MessageLog Writer
// ============================================================================
// Purpose: Writes every send attempt (success or failure) to MessageLog table
// Used by: sendWhatsAppMessage() after attempting to send
// Why: Provides audit trail and debugging capability for all WhatsApp messages
// ============================================================================

/**
 * Logs a message send attempt to the MessageLog table.
 * 
 * What this function does:
 * 1. Creates a MessageLog record in database
 * 2. Records shopDomain, recipient phone, messageType, referenceId
 * 3. Records success/failure status and any error messages
 * 4. Records Wylto message ID if available (from Wylto API response)
 * 5. Records sentAt timestamp if successful
 * 
 * @param {Object} params
 * @param {string} params.shopDomain - Shop domain
 * @param {string} params.recipient - WhatsApp phone number
 * @param {string} params.messageType - Template key like "ORDER_CREATED"
 * @param {string} [params.referenceId] - Related ID (e.g., order ID)
 * @param {string} [params.wyltoMessageId] - Message ID from Wylto API
 * @param {string} params.status - "sent" or "failed"
 * @param {string} [params.errorMessage] - Error message if failed
 * @returns {Promise<import("@prisma/client").MessageLog>}
 */
async function logMessage({
  shopDomain,
  recipient,
  messageType,
  referenceId,
  wyltoMessageId,
  status,
  errorMessage,
}) {
  return prisma.messageLog.create({
    data: {
      shopDomain,
      recipient,
      messageType,
      referenceId: referenceId || null,
      wyltoMessageId: wyltoMessageId || null,
      status,
      errorMessage: errorMessage || null,
      sentAt: status === "sent" ? new Date() : null,
    },
  });
}

// ============================================================================
// 1.2.5 - Wylto API HTTP Client
// ============================================================================
// Purpose: Makes actual HTTP request to Wylto API to send WhatsApp message
// Used by: sendWhatsAppMessage() after rendering template
// Returns: { success: boolean, wyltoMessageId?: string, statusCode?: number, error?: string }
// ============================================================================

/**
 * Sends a WhatsApp message via Wylto API.
 * 
 * What this function does:
 * 1. Builds HTTP request URL (WYLTO_API_BASE_URL + endpoint)
 * 2. Sets up HTTP headers (Authorization, Content-Type)
 * 3. Builds request body with message content and recipient
 * 4. Makes HTTP POST request with timeout
 * 5. Parses response and extracts Wylto message ID if available
 * 6. Returns success/failure result
 * 
 * @param {Object} params
 * @param {string} params.apiKey - Wylto API key
 * @param {string} params.accountId - Wylto Account ID
 * @param {string} params.to - WhatsApp phone number (recipient)
 * @param {string} params.messageText - Rendered message text
 * @returns {Promise<{success: boolean, wyltoMessageId?: string, statusCode?: number, error?: string}>}
 */
async function sendToWyltoAPI({ apiKey, accountId, to, messageText }) {
  try {
    // Step 1: Build API endpoint URL
    // TODO: Replace with actual Wylto API endpoint path when known
    const url = `${WYLTO_API_BASE_URL}/messages`;

    // Step 2: Build HTTP headers
    // Uses: apiKey and accountId for authentication
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`, // TODO: Adjust auth format based on Wylto API docs
      "X-Account-Id": accountId, // TODO: Adjust header name based on Wylto API docs
    };

    // Step 3: Build request body
    // TODO: Adjust body structure based on Wylto API documentation
    const body = {
      to, // WhatsApp phone number
      message: messageText, // Rendered message text
      // Add other fields as required by Wylto API
    };

    // Step 4: Make HTTP POST request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WYLTO_API_TIMEOUT);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Step 5: Parse response
    const responseData = await response.json();

    // Step 6: Check if request was successful
    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: responseData.message || `Wylto API error: ${response.status}`,
        wyltoMessageId: null,
      };
    }

    // Step 7: Extract Wylto message ID from response
    // TODO: Adjust field name based on Wylto API response structure
    const wyltoMessageId = responseData.messageId || responseData.id || null;

    return {
      success: true,
      wyltoMessageId,
      statusCode: response.status,
    };
  } catch (error) {
    // Handle network errors, timeouts, etc.
    return {
      success: false,
      error: error.message || "Failed to send message to Wylto API",
      statusCode: null,
      wyltoMessageId: null,
    };
  }
}

// ============================================================================
// 1.2.6 - Main Entry Point: sendWhatsAppMessage()
// ============================================================================
// Purpose: Main function that orchestrates the entire WhatsApp send flow
// Used by: Webhook handlers (orders/create, fulfillments/create, etc.)
// Flow:
//   1. Load Wylto config (getWyltoConfigForShop)
//   2. Render template (renderTemplate)
//   3. Send to Wylto API (sendToWyltoAPI)
//   4. Log to MessageLog (logMessage)
//   5. Return result
// ============================================================================

/**
 * Sends a WhatsApp message via Wylto for a given shop.
 * 
 * This is the main entry point that other code (webhooks, jobs) will call.
 * 
 * What this function does:
 * 1. Loads Wylto configuration from Store table (getWyltoConfigForShop)
 * 2. Renders message template with provided data (renderTemplate)
 * 3. Sends HTTP request to Wylto API (sendToWyltoAPI)
 * 4. Logs the attempt to MessageLog table (logMessage)
 * 5. Returns success/failure result
 * 
 * @param {Object} params
 * @param {string} params.shopDomain - Shopify shop domain
 * @param {string} params.templateKey - Template key like "ORDER_CREATED"
 * @param {string} params.to - WhatsApp phone number (recipient)
 * @param {Object} params.data - Data for template rendering (e.g., {customerName: "John"})
 * @param {string} [params.referenceId] - Related ID (e.g., order ID) for logging
 * @returns {Promise<{success: boolean, wyltoMessageId?: string, error?: string}>}
 */
export async function sendWhatsAppMessage({
  shopDomain,
  templateKey,
  to,
  data = {},
  referenceId,
}) {
  // Step 1: Validate required parameters
  if (!shopDomain) {
    throw new Error("shopDomain is required");
  }
  if (!templateKey) {
    throw new Error("templateKey is required");
  }
  if (!to) {
    throw new Error("recipient phone number (to) is required");
  }

  let wyltoConfig;
  let messageText;
  let apiResult;

  try {
    // Step 2: Load Wylto configuration from Store table
    // Uses: getWyltoConfigForShop() (1.2.2)
    // What it does: Fetches Store record, validates credentials exist, checks isActive
    wyltoConfig = await getWyltoConfigForShop(shopDomain);

    // Step 3: Render message template
    // Uses: renderTemplate() (1.2.3)
    // What it does: Replaces {{placeholders}} in template with actual data values
    messageText = renderTemplate(templateKey, data);

    // Step 4: Send HTTP request to Wylto API
    // Uses: sendToWyltoAPI() (1.2.5)
    // What it does: Makes POST request to Wylto API with message content
    apiResult = await sendToWyltoAPI({
      apiKey: wyltoConfig.apiKey,
      accountId: wyltoConfig.accountId,
      to,
      messageText,
    });
  } catch (error) {
    // If any step fails (config loading, template rendering, etc.)
    // Log as failed and return error
    await logMessage({
      shopDomain,
      recipient: to,
      messageType: templateKey,
      referenceId,
      wyltoMessageId: null,
      status: "failed",
      errorMessage: error.message,
    });

    return {
      success: false,
      error: error.message,
      wyltoMessageId: null,
    };
  }

  // Step 5: Log the send attempt to MessageLog table
  // Uses: logMessage() (1.2.4)
  // What it does: Creates MessageLog record with all details (success or failure)
  await logMessage({
    shopDomain,
    recipient: to,
    messageType: templateKey,
    referenceId,
    wyltoMessageId: apiResult.wyltoMessageId || null,
    status: apiResult.success ? "sent" : "failed",
    errorMessage: apiResult.error || null,
  });

  // Step 6: Return result to caller
  return {
    success: apiResult.success,
    wyltoMessageId: apiResult.wyltoMessageId || null,
    error: apiResult.error || null,
  };
}

