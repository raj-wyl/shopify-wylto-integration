import { authenticate } from "../shopify.server";

/**
 * Webhook: checkouts/update
 * Triggered when a checkout is updated or completed
 * Forwards to Wylto backend to track cart recovery conversions
 */
export const action = async ({ request }) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`[Webhook] ${topic} received for shop: ${shop}`);
    console.log(`[Webhook] Checkout Token: ${payload.token}, Completed: ${!!payload.completed_at}`);

    // Forward to Wylto backend
    const response = await fetch('https://server.wylto.com/api/shopify/webhooks', {
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
    console.error(`[Webhook] Error:`, error);
    return new Response(null, { status: 200 }); // Always return 200 to Shopify
  }
};
