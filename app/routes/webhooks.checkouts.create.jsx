import { authenticate } from "../shopify.server";
import { createWebhookLog, updateManyWebhookLogs } from "../webhook.service";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Log the webhook using service layer
    await createWebhookLog(shop, topic, payload, "processing");

    // TODO: Track abandoned cart for recovery
    // 1. Extract checkout token, customer phone, cart details
    // 2. Check if checkout is abandoned (not completed)
    // 3. Create PendingCart record with scheduled recovery time
    // 4. Schedule WhatsApp recovery message (e.g., 1 hour later)

    console.log(`Checkout created: ${payload.token} for ${shop}`);

    // Create pending cart for potential recovery
    if (payload.abandoned_checkout_url && payload.phone) {
      const scheduledFor = new Date();
      scheduledFor.setHours(scheduledFor.getHours() + 1); // Schedule 1 hour later

      await db.pendingCart.create({
        data: {
          shopDomain: shop,
          checkoutToken: payload.token,
          customerPhone: payload.phone || "N/A",
          customerName: payload.customer?.first_name || null,
          cartUrl: payload.abandoned_checkout_url,
          cartTotal: payload.total_price || null,
          itemCount: payload.line_items?.length || 0,
          scheduledFor,
          status: "pending",
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
