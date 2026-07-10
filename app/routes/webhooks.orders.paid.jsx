import { authenticate } from "../shopify.server";

/**
 * Webhook: orders/paid
 * Triggered when an order's payment is captured/marked as paid
 * Forwards to Wylto backend for payment confirmation / receipt messages
 */
export const action = async ({ request }) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`[Webhook] ${topic} received for shop: ${shop}`);
    console.log(`[Webhook] Order ID: ${payload.id}, Order Number: ${payload.name}, Financial Status: ${payload.financial_status || 'N/A'}`);
    // TEMP-COD: log payment method to verify COD detection — remove after test
    console.log(`[Webhook] [TEMP-COD] Gateway: ${payload.gateway || 'N/A'}, Payment Gateway Names: ${JSON.stringify(payload.payment_gateway_names || [])}`);

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
