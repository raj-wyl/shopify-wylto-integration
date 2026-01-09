/**
 * ============================================================================
 * Wylto Template System
 * ============================================================================
 *
 * This module provides WhatsApp message templates for different events.
 * Templates are rendered with customer data and sent via Wylto backend.
 *
 * Note: Message sending is handled by Wylto backend (server.wylto.com).
 * This module only provides template rendering for backward compatibility.
 * ============================================================================
 */

// ============================================================================
// Template Registry
// ============================================================================

/**
 * Message templates for different webhook events
 * Each template contains placeholders that are replaced with actual data
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

// ============================================================================
// Template Validation
// ============================================================================

/**
 * Validates that all required template fields are present in the data
 *
 * @param {string} templateKey - Template key like "ORDER_CREATED"
 * @param {Object} data - Data object to validate
 * @returns {{valid: boolean, missingFields: string[]}}
 */
function validateTemplateData(templateKey, data = {}) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    return {
      valid: false,
      missingFields: [],
      error: `Template not found: ${templateKey}`,
    };
  }

  const missingFields = template.requiredFields.filter(
    (field) => !data[field] || data[field] === ""
  );

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Renders a template by replacing placeholders with actual data
 *
 * Supports:
 * - Simple placeholders: {{field}}
 * - Conditional blocks: {{#field}}...{{/field}} (only renders if field exists)
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
  const validation = validateTemplateData(templateKey, data);
  if (!validation.valid) {
    throw new Error(
      `Missing required fields for template ${templateKey}: ${validation.missingFields.join(", ")}`
    );
  }

  // Step 3: Start with template text
  let rendered = template.textTemplate;

  // Step 4: Process conditional blocks {{#field}}...{{/field}}
  const conditionalBlockRegex = /\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs;
  rendered = rendered.replace(
    conditionalBlockRegex,
    (match, fieldName, blockContent) => {
      if (data[fieldName] && data[fieldName] !== "") {
        return blockContent;
      }
      return ""; // Remove block if field is missing or empty
    }
  );

  // Step 5: Replace simple placeholders {{field}} with data values
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    const replacement = value != null ? String(value) : "";
    rendered = rendered.replace(placeholder, replacement);
  }

  // Step 6: Clean up extra whitespace
  rendered = rendered
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return rendered;
}

// ============================================================================
// Template Info Helpers
// ============================================================================

/**
 * Gets information about a template
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
 * Gets all available template keys
 *
 * @returns {string[]} Array of template keys
 */
export function getAllTemplateKeys() {
  return Object.keys(TEMPLATES);
}

/**
 * Gets all templates with their metadata
 *
 * @returns {Array<{key: string, info: Object}>}
 */
export function getAllTemplates() {
  return Object.keys(TEMPLATES).map((key) => ({
    key,
    info: getTemplateInfo(key),
  }));
}
