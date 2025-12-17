import prisma from "./db.server";

/**
 * Fetch a Store record by its Shopify shop domain.
 *
 * @param {string} shopDomain - The myshopify domain for the shop.
 * @returns {Promise<import("@prisma/client").Store | null>}
 */
export async function getStoreByShopDomain(shopDomain) {
  if (!shopDomain) {
    throw new Error("shopDomain is required to load Store configuration");
  }

  return prisma.store.findUnique({
    where: { shopDomain },
  });
}

/**
 * Fetch a Store record for the given shop domain, creating a new one if none exists.
 * New records default to Wylto being disabled until configured.
 *
 * @param {string} shopDomain - The myshopify domain for the shop.
 * @returns {Promise<import("@prisma/client").Store>}
 */
export async function getOrCreateStore(shopDomain) {
  if (!shopDomain) {
    throw new Error("shopDomain is required to get or create Store configuration");
  }

  const existing = await getStoreByShopDomain(shopDomain);
  if (existing) return existing;

  return prisma.store.create({
    data: {
      shopDomain,
      isActive: false,
      wyltoApiKey: null,
      wyltoAccountId: null,
    },
  });
}

/**
 * Update or create the Store configuration for a shop.
 *
 * Any field set to undefined will be left unchanged on update.
 * New records default to Wylto being disabled if isActive is not provided.
 *
 * @param {string} shopDomain - The myshopify domain for the shop.
 * @param {Object} config
 * @param {string | null | undefined} [config.wyltoApiKey]
 * @param {string | null | undefined} [config.wyltoAccountId]
 * @param {boolean | undefined} [config.isActive]
 * @returns {Promise<import("@prisma/client").Store>}
 */
export async function updateStoreConfig(
  shopDomain,
  { wyltoApiKey, wyltoAccountId, isActive } = {},
) {
  if (!shopDomain) {
    throw new Error("shopDomain is required to update Store configuration");
  }

  return prisma.store.upsert({
    where: { shopDomain },
    create: {
      shopDomain,
      wyltoApiKey: wyltoApiKey ?? null,
      wyltoAccountId: wyltoAccountId ?? null,
      isActive: isActive ?? false,
    },
    update: {
      ...(wyltoApiKey !== undefined ? { wyltoApiKey } : {}),
      ...(wyltoAccountId !== undefined ? { wyltoAccountId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
}


