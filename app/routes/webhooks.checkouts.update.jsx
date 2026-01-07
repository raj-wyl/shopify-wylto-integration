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

    // TODO: Update pending cart or mark as converted
    // 1. Check if checkout was completed
    // 2. If completed, mark PendingCart as "converted"
    // 3. If still abandoned, update cart details

    console.log(`Checkout updated: ${payload.token} for ${shop}`);

    // If checkout is completed, mark pending cart as converted
    if (payload.completed_at) {
      await db.pendingCart.updateMany({
        where: {
          checkoutToken: payload.token,
          status: "pending",
        },
        data: {
          status: "converted",
        },
      });
    }

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
