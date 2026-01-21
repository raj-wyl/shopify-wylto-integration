import { authenticate } from "../shopify.server";

/**
 * Webhook: customers/redact
 * GDPR compliance: Customer requests data deletion (48 hours after data request)
 * Forwards to Wylto backend to handle customer data deletion
 */
export const action = async ({ request }) => {
  try {
    // Authenticate webhook - throws error if HMAC validation fails
    const { shop, payload, topic } = await authenticate.webhook(request);

    console.log(`[Webhook] ${topic} received for shop: ${shop}`);
    console.log(`[Webhook] Customer redact request:`, payload);

    // Forward to Wylto backend
    try {
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
    } catch (forwardError) {
      // Log forwarding errors but don't fail the webhook
      console.error(`[Webhook] Error forwarding to Wylto:`, forwardError);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    // HMAC validation failed - return 401 as required by Shopify
    console.error(`[Webhook] Authentication failed:`, error);
    return new Response(null, { status: 401 });
  }
};
