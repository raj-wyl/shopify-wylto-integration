import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { checkConnectionStatus } from "../wylto-connection.server";

/**
 * How to Use App Page
 * 
 * Provides step-by-step instructions on how to use the Wylto WhatsApp integration app.
 */

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Check connection status
  let connectionStatus = { connected: false };
  try {
    connectionStatus = await checkConnectionStatus(shopDomain);
  } catch (error) {
    console.error("Failed to check connection status:", error);
  }

  return {
    shopDomain,
    isConnected: connectionStatus.connected,
  };
};

export default function HowToUse() {
  const { isConnected } = useLoaderData();

  return (
    <s-page heading="How to Use Wylto">
      {/* Getting Started */}
      <s-section heading="Getting Started">
        <s-paragraph>
          Wylto automates WhatsApp messaging for your Shopify store. Follow these steps to get started:
        </s-paragraph>

        <s-stack direction="block" gap="base" marginBlockStart="base">
          {/* Step 1 */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                Step 1: Connect Your Wylto Account
              </s-text>
              {isConnected ? (
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="success-subdued"
                  marginBlockStart="tight"
                >
                  <s-text tone="success">✓ Your store is connected to Wylto</s-text>
                </s-box>
              ) : (
                <>
                  <s-paragraph>
                    Go to the Home page and enter your Wylto app token to connect your store.
                  </s-paragraph>
                  <s-unordered-list>
                    <s-list-item>
                      Get your Wylto app token from your Wylto Dashboard → Settings → API Settings
                    </s-list-item>
                    <s-list-item>
                      Enter the token on the Home page and click "Connect Store"
                    </s-list-item>
                    <s-list-item>
                      Once connected, WhatsApp messages will be sent automatically
                    </s-list-item>
                  </s-unordered-list>
                  <s-link href="/app">
                    <s-button variant="primary" marginBlockStart="base">
                      Go to Home Page →
                    </s-button>
                  </s-link>
                </>
              )}
            </s-stack>
          </s-box>

          {/* Step 2 */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                Step 2: Automatic Message Types
              </s-text>
              <s-paragraph>
                Once connected, Wylto automatically sends WhatsApp messages for:
              </s-paragraph>
              <s-unordered-list>
                <s-list-item>
                  <strong>Order Confirmations:</strong> Sent when a customer places an order
                </s-list-item>
                <s-list-item>
                  <strong>Shipping Updates:</strong> Sent when an order is fulfilled and shipped
                </s-list-item>
                <s-list-item>
                  <strong>Order Updates:</strong> Sent when order status changes
                </s-list-item>
                <s-list-item>
                  <strong>Cart Recovery:</strong> Sent to customers who abandon their cart (after 1 hour)
                </s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>

          {/* Step 3 */}
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                Step 3: Monitor via Wylto Dashboard
              </s-text>
              <s-paragraph>
                Track your WhatsApp message performance directly in your Wylto account:
              </s-paragraph>
              <s-unordered-list>
                <s-list-item>
                  Log in to your Wylto Dashboard to view message delivery reports
                </s-list-item>
                <s-list-item>
                  See success rates, message types, and recent activity
                </s-list-item>
                <s-list-item>
                  Manage WhatsApp templates and automation rules from the Wylto Dashboard
                </s-list-item>
              </s-unordered-list>
              <a
                href="https://wylto.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "inline-block", marginTop: "0.5rem" }}
              >
                <s-button variant="secondary">
                  Open Wylto Dashboard →
                </s-button>
              </a>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Requirements */}
      <s-section heading="Requirements" marginBlockStart="base">
        <s-paragraph>
          To use Wylto WhatsApp integration, you need:
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            A Wylto account with WhatsApp Business API access
          </s-list-item>
          <s-list-item>
            A Wylto app token (found in your Wylto Dashboard)
          </s-list-item>
          <s-list-item>
            Customer phone numbers in your Shopify orders (required for sending messages)
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {/* How It Works */}
      <s-section heading="How It Works" marginBlockStart="base">
        <s-paragraph>
          Wylto integrates seamlessly with your Shopify store:
        </s-paragraph>
        <s-stack direction="block" gap="base" marginBlockStart="base">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontWeight: "bold" }}>1. Webhook Integration</s-text>
              <s-text tone="subdued">
                Shopify sends webhooks to Wylto when orders are created, updated, or fulfilled.
              </s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontWeight: "bold" }}>2. Automatic Processing</s-text>
              <s-text tone="subdued">
                Wylto processes webhooks and sends WhatsApp messages automatically using your configured templates.
              </s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontWeight: "bold" }}>3. Message Delivery</s-text>
              <s-text tone="subdued">
                Messages are sent via WhatsApp Business API and delivered to your customers.
              </s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Troubleshooting */}
      <s-section heading="Troubleshooting" marginBlockStart="base">
        <s-paragraph>
          Common issues and solutions:
        </s-paragraph>
        <s-stack direction="block" gap="base" marginBlockStart="base">
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontWeight: "bold" }}>Messages not sending?</s-text>
              <s-unordered-list>
                <s-list-item>Verify your Wylto account is connected (check Home page)</s-list-item>
                <s-list-item>Ensure customer phone numbers are available in orders</s-list-item>
                <s-list-item>Check your Wylto Dashboard for delivery status and error details</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="tight">
              <s-text style={{ fontWeight: "bold" }}>Connection issues?</s-text>
              <s-unordered-list>
                <s-list-item>Verify your Wylto app token is correct</s-list-item>
                <s-list-item>Check that your Wylto account is active</s-list-item>
                <s-list-item>Contact Wylto support if problems persist</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Support */}
      <s-section heading="Need Help?" marginBlockStart="base">
        <s-paragraph>
          For additional support:
        </s-paragraph>
        <s-stack direction="inline" gap="base" marginBlockStart="base">
          <a
            href="https://wylto.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <s-button variant="secondary">Visit Wylto Website</s-button>
          </a>
          <s-link href="/app">
            <s-button variant="secondary">Go to Home</s-button>
          </s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

