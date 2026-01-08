import { authenticate } from "../shopify.server";
import db from "../db.server";
import { sendWhatsAppMessage } from "../wylto.server";

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

    // Process order and send WhatsApp confirmation via Wylto
    console.log(`Order created: ${payload.id} for ${shop}`);

    // Extract order details from payload
    const customerPhone =
      payload.customer?.phone ||
      payload.billing_address?.phone ||
      payload.shipping_address?.phone;

    // Only send WhatsApp if customer has a phone number
    if (customerPhone) {
      try {
        const orderNumber = payload.name || payload.order_number || `#${payload.id}`;
        const customerName =
          payload.customer?.first_name ||
          payload.billing_address?.first_name ||
          "Customer";
        const shopName = shop.replace(".myshopify.com", "");
        const total = payload.total_price || "0";
        const currency = payload.currency || "USD";
        const orderUrl = `https://${shop}/admin/orders/${payload.id}`;

        // Send WhatsApp message using ORDER_CREATED template
        await sendWhatsAppMessage({
          shopDomain: shop,
          templateKey: "ORDER_CREATED",
          to: customerPhone,
          data: {
            customerName,
            orderNumber,
            shopName,
            total,
            currency,
            orderUrl,
          },
          referenceId: payload.id?.toString(),
        });

        console.log(`WhatsApp message sent for order ${orderNumber} to ${customerPhone}`);
      } catch (error) {
        // Log error but don't fail the webhook
        console.error(`Failed to send WhatsApp message for order ${payload.id}:`, error);
        // Error is already logged in MessageLog by sendWhatsAppMessage
      }
    } else {
      console.log(`Order ${payload.id} has no customer phone number, skipping WhatsApp message`);
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
