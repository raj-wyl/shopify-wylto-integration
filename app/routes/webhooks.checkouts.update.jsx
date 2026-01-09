import { authenticate } from "../shopify.server";
import { createWebhookLog, updateManyWebhookLogs } from "../webhook.service";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Log the webhook using service layer
    await createWebhookLog(shop, topic, payload, "processing");

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

    // Update webhook log status using service layer
    await updateManyWebhookLogs(
      shop,
      { topic, payload: JSON.stringify(payload) },
      { status: "completed" }
    );

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(`Error processing ${topic}:`, error);

    // Log error using service layer
    await createWebhookLog(shop, topic, payload, "failed", error.message);

    return new Response(null, { status: 500 });
  }
};
