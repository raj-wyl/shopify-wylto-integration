import db from "./db.server";

/**
 * Webhook Service Layer
 * 
 * Provides service functions for webhook logging operations instead of direct Prisma access.
 * This follows the same pattern as store.server.js and analytics.service.js for better separation of concerns.
 */

/**
 * Create a webhook log entry
 * @param {string} shopDomain - The myshopify domain for the shop
 * @param {string} topic - The webhook topic (e.g., "orders/create")
 * @param {Object} payload - The webhook payload object
 * @param {string} status - Initial status (default: "received")
 * @param {string} errorMessage - Optional error message
 * @returns {Promise<Object>} Created webhook log entry
 */
export async function createWebhookLog(shopDomain, topic, payload, status = "received", errorMessage = null) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for webhook logging");
  }
  if (!topic) {
    throw new Error("topic is required for webhook logging");
  }

  return db.webhookLog.create({
    data: {
      shopDomain,
      topic,
      payload: typeof payload === "string" ? payload : JSON.stringify(payload),
      status,
      ...(errorMessage ? { errorMessage } : {}),
    },
  });
}

/**
 * Update a webhook log entry
 * @param {string} webhookLogId - The ID of the webhook log entry
 * @param {Object} updates - Fields to update (status, errorMessage)
 * @returns {Promise<Object>} Updated webhook log entry
 */
export async function updateWebhookLog(webhookLogId, updates) {
  if (!webhookLogId) {
    throw new Error("webhookLogId is required to update webhook log");
  }

  return db.webhookLog.update({
    where: { id: webhookLogId },
    data: updates,
  });
}

/**
 * Update multiple webhook log entries
 * @param {string} shopDomain - The myshopify domain for the shop
 * @param {Object} where - Prisma where clause
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} Update result with count
 */
export async function updateManyWebhookLogs(shopDomain, where, data) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for bulk webhook log updates");
  }

  return db.webhookLog.updateMany({
    where: {
      shopDomain,
      ...where,
    },
    data,
  });
}
