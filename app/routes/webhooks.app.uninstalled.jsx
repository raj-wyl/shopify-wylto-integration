import { authenticate } from "../shopify.server";

/**
 * Webhook: app/uninstalled
 * Triggered when the app is uninstalled from a store
 *
 * Note: We use MemorySessionStorage, so sessions are automatically cleared on restart.
 * This webhook is mainly for logging purposes.
 */
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} received for ${shop}`);
  console.log(`[Webhook] App uninstalled from ${shop}`);

  // Sessions are stored in memory and will be cleared automatically
  // No database cleanup needed

  return new Response();
};
