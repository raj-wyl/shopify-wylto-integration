#!/bin/bash

# Script to check webhooks using Shopify Admin API via curl
# Usage: ./check-webhooks-curl.sh

# You need to provide your Shopify access token
# Get it from: Your app installation or use the one saved in Wylto

SHOP="wylto-test-store.myshopify.com"
# IMPORTANT: Replace with your actual access token
# You can get this from your Wylto backend or from the session
ACCESS_TOKEN="${SHOPIFY_ACCESS_TOKEN:-YOUR_ACCESS_TOKEN_HERE}"

if [ "$ACCESS_TOKEN" = "YOUR_ACCESS_TOKEN_HERE" ]; then
  echo "❌ Error: Please set your Shopify access token"
  echo ""
  echo "Option 1: Set environment variable:"
  echo "  export SHOPIFY_ACCESS_TOKEN='shpat_xxxxx'"
  echo "  ./check-webhooks-curl.sh"
  echo ""
  echo "Option 2: Edit this script and replace YOUR_ACCESS_TOKEN_HERE"
  echo ""
  echo "Option 3: Use the Shopify CLI console (see below)"
  exit 1
fi

QUERY='query {
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
}'

echo "🔍 Checking webhooks for: $SHOP"
echo ""

curl -X POST \
  "https://$SHOP/admin/api/2025-10/graphql.json" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Access-Token: $ACCESS_TOKEN" \
  -d "{\"query\": $(echo "$QUERY" | jq -Rs .)}" \
  | jq '
    .data.webhookSubscriptions.edges[] |
    {
      topic: .node.topic,
      endpoint: .node.endpoint.callbackUrl,
      created: .node.createdAt
    }
  '

echo ""
echo "✅ Webhook check complete!"
