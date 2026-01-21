import { authenticate } from "../shopify.server";

/**
 * Webhook: fulfillments/create
 * Triggered when an order is fulfilled/shipped
 * Forwards to Wylto backend for processing and WhatsApp shipping notifications
 */
export const action = async ({ request }) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`[Webhook] ${topic} received for shop: ${shop}`);
    console.log(`[Webhook] Fulfillment ID: ${payload.id}, Tracking: ${payload.tracking_number || 'N/A'}`);

    // Forward to Wylto backend
    const response = await fetch('https://server.wylto.com/api/shopify/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WYLTO_API_TOKEN}`
      },
      body: JSON.stringify({
        shop,
        topic,
        data: payload
      })
    });

    if (!response.ok) {
      console.error(`[Webhook] Forward failed: ${response.status} ${response.statusText}`);
      // Don't return error to Shopify - they'll retry
    } else {
      console.log(`[Webhook] Forwarded successfully to Wylto backend`);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    // HMAC validation failed - return 401 as required by Shopify
    console.error(`[Webhook] Error:`, error);
    return new Response(null, { status: 401 });
  }
};
