import prisma from "./db.server";

/**
 * Analytics Service Layer
 * 
 * Provides service functions for analytics queries instead of direct Prisma access.
 * This follows the same pattern as store.server.js for better separation of concerns.
 */

/**
 * Get message statistics for a shop
 * @param {string} shopDomain - The myshopify domain for the shop
 * @param {Date} startDate - Optional start date for filtering
 * @returns {Promise<Object>} Message statistics
 */
export async function getMessageStats(shopDomain, startDate = null) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for message statistics");
  }

  const whereClause = { shopDomain };
  if (startDate) {
    whereClause.createdAt = { gte: startDate };
  }

  return {
    total: await prisma.messageLog.count({ where: whereClause }),
    byStatus: await prisma.messageLog.groupBy({
      by: ["status"],
      where: { shopDomain },
      _count: true,
    }),
    byType: await prisma.messageLog.groupBy({
      by: ["messageType"],
      where: { shopDomain },
      _count: true,
      orderBy: { _count: { messageType: "desc" } },
      take: 10,
    }),
  };
}

/**
 * Get webhook statistics for a shop
 * @param {string} shopDomain - The myshopify domain for the shop
 * @param {Date} startDate - Optional start date for filtering
 * @returns {Promise<Object>} Webhook statistics
 */
export async function getWebhookStats(shopDomain, startDate = null) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for webhook statistics");
  }

  const whereClause = { shopDomain };
  if (startDate) {
    whereClause.createdAt = { gte: startDate };
  }

  return {
    total: await prisma.webhookLog.count({ where: whereClause }),
    byStatus: await prisma.webhookLog.groupBy({
      by: ["status"],
      where: { shopDomain },
      _count: true,
    }),
    byTopic: await prisma.webhookLog.groupBy({
      by: ["topic"],
      where: { shopDomain },
      _count: true,
      orderBy: { _count: { topic: "desc" } },
      take: 10,
    }),
  };
}

/**
 * Get cart recovery statistics for a shop
 * @param {string} shopDomain - The myshopify domain for the shop
 * @param {Date} startDate - Optional start date for filtering
 * @returns {Promise<Object>} Cart recovery statistics
 */
export async function getCartStats(shopDomain, startDate = null) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for cart statistics");
  }

  const whereClause = { shopDomain };
  if (startDate) {
    whereClause.createdAt = { gte: startDate };
  }

  return {
    total: await prisma.pendingCart.count({ where: whereClause }),
    byStatus: await prisma.pendingCart.groupBy({
      by: ["status"],
      where: { shopDomain },
      _count: true,
    }),
  };
}

/**
 * Get recent messages for a shop
 * @param {string} shopDomain - The myshopify domain for the shop
 * @param {number} limit - Number of recent messages to return (default: 10)
 * @returns {Promise<Array>} Recent messages
 */
export async function getRecentMessages(shopDomain, limit = 10) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for recent messages");
  }

  return prisma.messageLog.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      recipient: true,
      messageType: true,
      status: true,
      createdAt: true,
      sentAt: true,
      errorMessage: true,
    },
  });
}

/**
 * Get time-series data for messages and webhooks by day
 * @param {string} shopDomain - The myshopify domain for the shop
 * @param {number} days - Number of days to include (default: 7)
 * @returns {Promise<Object>} Time-series data with labels, messages, and webhooks arrays
 */
export async function getTimeSeriesData(shopDomain, days = 7) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for time-series data");
  }

  const now = new Date();
  const messagesByDay = [];
  const webhooksByDay = [];
  const labels = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayLabel = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    labels.push(dayLabel);

    const dayMessages = await prisma.messageLog.count({
      where: {
        shopDomain,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });
    messagesByDay.push(dayMessages);

    const dayWebhooks = await prisma.webhookLog.count({
      where: {
        shopDomain,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });
    webhooksByDay.push(dayWebhooks);
  }

  return {
    labels,
    messagesByDay,
    webhooksByDay,
  };
}

/**
 * Get all analytics data for a shop
 * @param {string} shopDomain - The myshopify domain for the shop
 * @returns {Promise<Object>} Complete analytics data
 */
export async function getAllAnalytics(shopDomain) {
  if (!shopDomain) {
    throw new Error("shopDomain is required for analytics");
  }

  // Calculate date ranges
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all statistics in parallel
  const [
    allMessageStats,
    last7DaysMessageStats,
    last30DaysMessageStats,
    allWebhookStats,
    last7DaysWebhookStats,
    allCartStats,
    last7DaysCartStats,
    recentMessages,
    timeSeriesData,
  ] = await Promise.all([
    getMessageStats(shopDomain),
    getMessageStats(shopDomain, last7Days),
    getMessageStats(shopDomain, last30Days),
    getWebhookStats(shopDomain),
    getWebhookStats(shopDomain, last7Days),
    getCartStats(shopDomain),
    getCartStats(shopDomain, last7Days),
    getRecentMessages(shopDomain, 10),
    getTimeSeriesData(shopDomain, 7),
  ]);

  // Calculate success rate
  const sentMessages = allMessageStats.byStatus.find((s) => s.status === "sent")?._count || 0;
  const failedMessages = allMessageStats.byStatus.find((s) => s.status === "failed")?._count || 0;
  const totalMessages = allMessageStats.total;
  const successRate = totalMessages > 0 
    ? Math.round((sentMessages / totalMessages) * 100) 
    : 0;

  return {
    shopDomain,
    // Message stats
    totalMessages: allMessageStats.total,
    messagesLast7Days: last7DaysMessageStats.total,
    messagesLast30Days: last30DaysMessageStats.total,
    messagesByStatus: allMessageStats.byStatus,
    messagesByType: allMessageStats.byType,
    successRate,
    // Webhook stats
    totalWebhooks: allWebhookStats.total,
    webhooksLast7Days: last7DaysWebhookStats.total,
    webhooksByStatus: allWebhookStats.byStatus,
    webhooksByTopic: allWebhookStats.byTopic,
    // Cart stats
    totalCarts: allCartStats.total,
    cartsLast7Days: last7DaysCartStats.total,
    cartsByStatus: allCartStats.byStatus,
    // Recent activity
    recentMessages,
    // Time-series data
    messagesByDay: timeSeriesData.messagesByDay,
    webhooksByDay: timeSeriesData.webhooksByDay,
    labels: timeSeriesData.labels,
  };
}
