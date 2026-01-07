import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Log the webhook
    await db.webhookLog.create({
      data: {
        shopDomain: shop,
        topic,
        payload: JSON.stringify(payload),
        status: "processing",
      },
    });

    // TODO: Process order and send WhatsApp confirmation via Wylto
    // 1. Extract order details (order number, customer phone, items, total)
    // 2. Get store's Wylto API key from db.store
    // 3. Send WhatsApp message via Wylto API
    // 4. Log message in db.messageLog

    console.log(`Order created: ${payload.id} for ${shop}`);

    // Update webhook log status
    await db.webhookLog.updateMany({
      where: {
        shopDomain: shop,
        topic,
        payload: JSON.stringify(payload),
      },
      data: {
        status: "completed",
      },
    });

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(`Error processing ${topic}:`, error);

    // Log error
    await db.webhookLog.create({
      data: {
        shopDomain: shop,
        topic,
        payload: JSON.stringify(payload),
        status: "failed",
        errorMessage: error.message,
      },
    });

    return new Response(null, { status: 500 });
  }
};
