import { authenticate } from "../shopify.server";
import { createWebhookLog, updateManyWebhookLogs } from "../webhook.service";
import { sendWhatsAppMessage } from "../wylto.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    // Log the webhook using service layer
    await createWebhookLog(shop, topic, payload, "processing");

    // Process fulfillment and send shipping notification via Wylto
    console.log(`Fulfillment created: ${payload.id} for ${shop}`);

    // Extract fulfillment details from payload
    const orderId = payload.order_id?.toString();
    const trackingNumber = payload.tracking_number || payload.tracking_numbers?.[0];
    const carrier = payload.tracking_company || payload.tracking_company_name;

    // Get order details to find customer phone
    // Note: Fulfillment payload may not include customer phone directly
    // We'll need to fetch order or use order_id as reference
    if (orderId) {
      try {
        // Extract customer info from fulfillment payload if available
        const customerPhone =
          payload.order?.customer?.phone ||
          payload.order?.billing_address?.phone ||
          payload.order?.shipping_address?.phone;

        if (customerPhone) {
          const orderNumber =
            payload.order?.name ||
            payload.order?.order_number ||
            `#${orderId}`;
          const customerName =
            payload.order?.customer?.first_name ||
            payload.order?.billing_address?.first_name ||
            "Customer";

          // Send WhatsApp message using ORDER_FULFILLED template
          await sendWhatsAppMessage({
            shopDomain: shop,
            templateKey: "ORDER_FULFILLED",
            to: customerPhone,
            data: {
              customerName,
              orderNumber,
              trackingNumber,
              carrier,
            },
            referenceId: orderId,
          });

          console.log(
            `WhatsApp fulfillment message sent for order ${orderNumber} to ${customerPhone}`
          );
        } else {
          console.log(
            `Fulfillment ${payload.id} has no customer phone number, skipping WhatsApp message`
          );
        }
      } catch (error) {
        // Log error but don't fail the webhook
        console.error(`Failed to send WhatsApp fulfillment message:`, error);
        // Error is already logged in MessageLog by sendWhatsAppMessage
      }
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
