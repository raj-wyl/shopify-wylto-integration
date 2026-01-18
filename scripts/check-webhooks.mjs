#!/usr/bin/env node

/**
 * Check registered webhooks using Shopify Admin API
 * Run: node scripts/check-webhooks.mjs
 */

import https from 'https';

const SHOP = 'wylto-test-store.myshopify.com';
const API_VERSION = '2025-10';

// You'll need to provide an access token
// Get it from your Wylto backend: https://server.wylto.com/api/shopify/token?shop=wylto-test-store.myshopify.com
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || process.argv[2];

const QUERY = `
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

function makeGraphQLRequest(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });

    const options = {
      hostname: SHOP,
      port: 443,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'X-Shopify-Access-Token': ACCESS_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Failed to parse response: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function checkWebhooks() {
  console.log('🔍 Checking registered webhooks...\n');

  if (!ACCESS_TOKEN || ACCESS_TOKEN.length < 10) {
    console.error('❌ Error: Shopify access token not provided\n');
    console.log('Usage:');
    console.log('  Method 1: node scripts/check-webhooks.mjs YOUR_ACCESS_TOKEN');
    console.log('  Method 2: SHOPIFY_ACCESS_TOKEN=xxx node scripts/check-webhooks.mjs\n');
    console.log('Get your access token from:');
    console.log('  - Your Wylto backend API');
    console.log('  - Or check the Cloud Run environment variables\n');
    process.exit(1);
  }

  try {
    const response = await makeGraphQLRequest(QUERY);

    if (response.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(response.errors, null, 2));
      process.exit(1);
    }

    const webhooks = response.data.webhookSubscriptions.edges;

    console.log(`✅ Found ${webhooks.length} registered webhooks:\n`);
    console.log('='.repeat(80));

    webhooks.forEach((edge, index) => {
      const webhook = edge.node;
      console.log(`\n${index + 1}. 📌 ${webhook.topic}`);
      console.log(`   🔗 ${webhook.endpoint.callbackUrl}`);
      console.log(`   📅 Created: ${new Date(webhook.createdAt).toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(80));

    // Verify expected webhooks
    const expectedWebhooks = [
      'APP_UNINSTALLED',
      'APP_SCOPES_UPDATE',
      'ORDERS_CREATE',
      'ORDERS_UPDATED',
      'FULFILLMENTS_CREATE',
      'CHECKOUTS_CREATE',
      'CHECKOUTS_UPDATE'
    ];

    console.log('\n📋 Verification Status:\n');

    const registeredTopics = webhooks.map(w => w.node.topic);

    expectedWebhooks.forEach(topic => {
      const found = registeredTopics.includes(topic);
      const status = found ? '✅' : '❌';
      console.log(`   ${status} ${topic}`);
    });

    const allRegistered = expectedWebhooks.every(t => registeredTopics.includes(t));

    console.log('\n' + '='.repeat(80));
    console.log(allRegistered ? '\n🎉 All webhooks registered successfully!' : '\n⚠️  Some webhooks are missing!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWebhooks();
