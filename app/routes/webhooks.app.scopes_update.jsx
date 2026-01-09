import { authenticate } from "../shopify.server";

/**
 * Webhook: app/scopes_update
 * Triggered when app scopes are updated
 *
 * Note: We use MemorySessionStorage, so scope updates will be handled
 * automatically on next authentication.
 */
export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`[Webhook] ${topic} received for ${shop}`);
  console.log(`[Webhook] New scopes:`, payload.current);

  // Sessions are stored in memory
  // New scopes will be applied on next OAuth flow

  return new Response();
};
