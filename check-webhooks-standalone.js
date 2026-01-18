/**
 * Standalone script to check registered webhooks
 * Run with: node check-webhooks-standalone.js
 */

import { shopifyApp } from "@shopify/shopify-app-react-router/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";
import { ApiVersion } from "@shopify/shopify-app-react-router/server";

const SHOP = 'wylto-test-store.myshopify.com';

const CHECK_WEBHOOKS_QUERY = `
  query {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
          createdAt
          updatedAt
        }
      }
    }
  }
`;

async function checkWebhooks() {
  try {
    console.log('🔍 Checking registered webhooks for:', SHOP);
    console.log('');

    // Initialize shopify instance
    const shopify = shopifyApp({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
      apiVersion: ApiVersion.October25,
      scopes: process.env.SCOPES?.split(","),
      appUrl: process.env.SHOPIFY_APP_URL || "",
      sessionStorage: new MemorySessionStorage(),
    });

    // Load the session for the shop
    const sessionId = shopify.sessionStorage.getSessionId({
      shop: SHOP,
      isOnline: false,
    });

    const session = await shopify.sessionStorage.loadSession(sessionId);

    if (!session) {
      console.error('❌ No session found for shop:', SHOP);
      console.error('💡 The app needs to be installed and session must be in memory.');
      console.error('');
      console.error('Alternative: Check webhooks directly in Shopify Admin:');
      console.error('   Settings → Notifications → Webhooks → App webhooks');
      console.error('   OR');
      console.error('   Settings → Apps and sales channels → Wylto Support → View app webhooks');
      process.exit(1);
    }

    console.log('✅ Session found! Querying webhooks...\n');

    // Create GraphQL client
    const client = new shopify.clients.Graphql({ session });

    // Query webhooks
    const response = await client.request(CHECK_WEBHOOKS_QUERY);

    const webhooks = response.data.webhookSubscriptions.edges;

    console.log(`✅ Found ${webhooks.length} registered webhooks:\n`);
    console.log('='.repeat(80));

    webhooks.forEach((edge, index) => {
      const webhook = edge.node;
      console.log(`\n${index + 1}. Topic: ${webhook.topic}`);
      console.log(`   Endpoint: ${webhook.endpoint.callbackUrl}`);
      console.log(`   Created: ${new Date(webhook.createdAt).toLocaleString()}`);
      console.log(`   ID: ${webhook.id}`);
    });

    console.log('\n' + '='.repeat(80));

    // Check if all expected webhooks are registered
    const expectedWebhooks = [
      'APP_UNINSTALLED',
      'APP_SCOPES_UPDATE',
      'ORDERS_CREATE',
      'ORDERS_UPDATED',
      'FULFILLMENTS_CREATE',
      'CHECKOUTS_CREATE',
      'CHECKOUTS_UPDATE'
    ];

    console.log('\n📋 Verification:\n');
    expectedWebhooks.forEach(topic => {
      const found = webhooks.find(w => w.node.topic === topic);
      const status = found ? '✅' : '❌';
      console.log(`${status} ${topic}`);
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ Error checking webhooks:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

checkWebhooks();
