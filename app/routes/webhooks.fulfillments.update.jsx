import { authenticate } from "../shopify.server";

/**
 * Webhook: fulfillments/update
 * Triggered by Shopify when carrier tracking status changes (in_transit, out_for_delivery, delivered, etc.)
 * Forwards to Wylto backend to trigger inTransit, outForDelivery, delivered workflow keys
 */
export const action = async ({ request }) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`[Webhook] ${topic} received for shop: ${shop}`);
    console.log(`[Webhook] Fulfillment ID: ${payload.id}, Shipment Status: ${payload.shipment_status || 'N/A'}`);

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
    } else {
      console.log(`[Webhook] Forwarded successfully to Wylto backend`);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(`[Webhook] Error:`, error);
    return new Response(null, { status: 401 });
  }
};
