import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { sendWhatsAppMessage } from "../wylto.server";
import db from "../db.server";

/**
 * ============================================================================
 * Test Webhooks Route - Simulates Webhook Calls
 * ============================================================================
 * 
 * This route allows you to test webhook handlers without creating real orders.
 * It simulates webhook payloads and calls the same functions that real webhooks use.
 * 
 * Access via: /app/test-webhooks
 * ============================================================================
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  return {
    shopDomain,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const testType = formData.get("testType");

  const results = {
    success: false,
    message: "",
    webhookLog: null,
    messageLog: null,
    error: null,
  };

  try {
    if (testType === "order_created") {
      // Simulate orders/create webhook payload
      const mockPayload = {
        id: `gid://shopify/Order/${Date.now()}`,
        name: `#TEST${Date.now()}`,
        order_number: Date.now(),
        total_price: "99.99",
        currency: "USD",
        customer: {
          first_name: "Test",
          last_name: "Customer",
          phone: "+1234567890",
        },
        billing_address: {
          phone: "+1234567890",
        },
        shipping_address: {
          phone: "+1234567890",
        },
      };

      // Log webhook
      const webhookLog = await db.webhookLog.create({
        data: {
          shopDomain,
          topic: "orders/create",
          payload: JSON.stringify(mockPayload),
          status: "processing",
        },
      });

      // Extract customer phone
      const customerPhone =
        mockPayload.customer?.phone ||
        mockPayload.billing_address?.phone ||
        mockPayload.shipping_address?.phone;

      if (customerPhone) {
        const orderNumber = mockPayload.name || mockPayload.order_number || `#${mockPayload.id}`;
        const customerName =
          mockPayload.customer?.first_name ||
          mockPayload.billing_address?.first_name ||
          "Customer";
        const shopName = shopDomain.replace(".myshopify.com", "");
        const total = mockPayload.total_price || "0";
        const currency = mockPayload.currency || "USD";
        const orderUrl = `https://${shopDomain}/admin/orders/${mockPayload.id}`;

        // Send WhatsApp message
        await sendWhatsAppMessage({
          shopDomain,
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
          referenceId: mockPayload.id?.toString(),
        });

        // Update webhook log
        await db.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: "completed" },
        });

        results.success = true;
        results.message = `Test order created and WhatsApp message sent to ${customerPhone}`;
        results.webhookLog = webhookLog;
      } else {
        results.message = "No customer phone number in test payload";
      }
    } else if (testType === "order_fulfilled") {
      // Simulate fulfillments/create webhook payload
      const mockPayload = {
        id: `gid://shopify/Fulfillment/${Date.now()}`,
        order_id: `gid://shopify/Order/${Date.now()}`,
        tracking_number: "TEST123456",
        tracking_company: "Test Shipping",
        order: {
          id: `gid://shopify/Order/${Date.now()}`,
          name: `#TEST${Date.now()}`,
          customer: {
            first_name: "Test",
            last_name: "Customer",
            phone: "+1234567890",
          },
        },
      };

      // Log webhook
      const webhookLog = await db.webhookLog.create({
        data: {
          shopDomain,
          topic: "fulfillments/create",
          payload: JSON.stringify(mockPayload),
          status: "processing",
        },
      });

      // Extract customer phone from nested order
      const customerPhone = mockPayload.order?.customer?.phone;

      if (customerPhone) {
        const orderNumber = mockPayload.order?.name || `#${mockPayload.order_id}`;
        const customerName = mockPayload.order?.customer?.first_name || "Customer";
        const trackingNumber = mockPayload.tracking_number || "N/A";
        const carrier = mockPayload.tracking_company || "Shipping";

        // Send WhatsApp message
        await sendWhatsAppMessage({
          shopDomain,
          templateKey: "ORDER_FULFILLED",
          to: customerPhone,
          data: {
            customerName,
            orderNumber,
            trackingNumber,
            carrier,
          },
          referenceId: mockPayload.order_id?.toString(),
        });

        // Update webhook log
        await db.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: "completed" },
        });

        results.success = true;
        results.message = `Test fulfillment created and WhatsApp message sent to ${customerPhone}`;
        results.webhookLog = webhookLog;
      } else {
        results.message = "No customer phone number in test payload";
      }
    } else if (testType === "order_cancelled") {
      // Simulate orders/updated webhook with cancellation
      const mockPayload = {
        id: `gid://shopify/Order/${Date.now()}`,
        name: `#TEST${Date.now()}`,
        cancelled_at: new Date().toISOString(),
        financial_status: "refunded",
        customer: {
          first_name: "Test",
          last_name: "Customer",
          phone: "+1234567890",
        },
      };

      // Log webhook
      const webhookLog = await db.webhookLog.create({
        data: {
          shopDomain,
          topic: "orders/updated",
          payload: JSON.stringify(mockPayload),
          status: "processing",
        },
      });

      const customerPhone = mockPayload.customer?.phone;

      if (customerPhone) {
        const orderNumber = mockPayload.name || `#${mockPayload.id}`;
        const customerName = mockPayload.customer?.first_name || "Customer";

        // Send WhatsApp message
        await sendWhatsAppMessage({
          shopDomain,
          templateKey: "ORDER_CANCELLED",
          to: customerPhone,
          data: {
            customerName,
            orderNumber,
          },
          referenceId: mockPayload.id?.toString(),
        });

        // Update webhook log
        await db.webhookLog.update({
          where: { id: webhookLog.id },
          data: { status: "completed" },
        });

        results.success = true;
        results.message = `Test order cancelled and WhatsApp message sent to ${customerPhone}`;
        results.webhookLog = webhookLog;
      } else {
        results.message = "No customer phone number in test payload";
      }
    }

    return results;
  } catch (error) {
    console.error("Test webhook error:", error);
    results.error = error.message;
    return results;
  }
};

export default function TestWebhooks() {
  const { shopDomain } = useLoaderData();
  const fetcher = useFetcher();
  const appBridge = useAppBridge();

  const [lastResult, setLastResult] = useState(null);

  const handleTest = async (testType) => {
    const formData = new FormData();
    formData.append("testType", testType);
    
    fetcher.submit(formData, { method: "post" });
  };

  // Update lastResult when fetcher.data changes
  if (fetcher.data && fetcher.data !== lastResult) {
    setLastResult(fetcher.data);
  }

  return (
    <div style={{ padding: "2rem" }}>
      <s-page>
        <s-layout>
          <s-layout-section>
            <s-card>
              <s-text variant="headingMd" as="h2">
                Test Webhooks (Simulated)
              </s-text>
              <s-text variant="bodyMd" tone="subdued" as="p">
                Test webhook handlers without creating real orders. These tests simulate webhook payloads and call the same functions that real webhooks use.
              </s-text>

              <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <s-button
                  variant="primary"
                  onClick={() => handleTest("order_created")}
                  loading={fetcher.state === "submitting"}
                >
                  Test Order Created Webhook
                </s-button>

                <s-button
                  variant="primary"
                  onClick={() => handleTest("order_fulfilled")}
                  loading={fetcher.state === "submitting"}
                >
                  Test Order Fulfilled Webhook
                </s-button>

                <s-button
                  variant="primary"
                  onClick={() => handleTest("order_cancelled")}
                  loading={fetcher.state === "submitting"}
                >
                  Test Order Cancelled Webhook
                </s-button>
              </div>

              {lastResult && (
                <div style={{ marginTop: "2rem" }}>
                  <s-card>
                    <s-text variant="headingSm" as="h3">
                      Test Result
                    </s-text>
                    {lastResult.success ? (
                      <div>
                        <s-text variant="bodyMd" tone="success">
                          ✓ {lastResult.message}
                        </s-text>
                        {lastResult.webhookLog && (
                          <div style={{ marginTop: "1rem" }}>
                            <s-text variant="bodySm" tone="subdued">
                              Webhook Log ID: {lastResult.webhookLog.id}
                            </s-text>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <s-text variant="bodyMd" tone="critical">
                          ✗ {lastResult.message || lastResult.error || "Test failed"}
                        </s-text>
                      </div>
                    )}
                  </s-card>
                </div>
              )}

              <div style={{ marginTop: "2rem" }}>
                <s-card>
                  <s-text variant="headingSm" as="h3">
                    Next Steps
                  </s-text>
                  <s-text variant="bodyMd" as="p">
                    After running tests, check Prisma Studio to see:
                  </s-text>
                  <ul>
                    <li>
                      <s-text variant="bodyMd">WebhookLog table - Webhook entries</s-text>
                    </li>
                    <li>
                      <s-text variant="bodyMd">MessageLog table - WhatsApp message attempts</s-text>
                    </li>
                  </ul>
                  <s-text variant="bodySm" tone="subdued" as="p">
                    Run: <code>npx prisma studio</code> to open database viewer
                  </s-text>
                </s-card>
              </div>
            </s-card>
          </s-layout-section>
        </s-layout>
      </s-page>
    </div>
  );
}

