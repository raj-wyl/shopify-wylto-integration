import { useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const query = formData.get("query");

  if (!query) {
    return { error: "Query is required" };
  }

  try {
    // Log the query for debugging (remove in production)
    console.log("Executing GraphQL query:", query.substring(0, 100) + "...");
    
    const response = await admin.graphql(query);
    
    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error("GraphQL HTTP Error:", response.status, errorText);
      return { 
        error: `HTTP Error ${response.status}: ${errorText}`,
        status: response.status 
      };
    }

    const responseJson = await response.json();
    console.log("GraphQL Response:", responseJson);

    // Check for GraphQL errors
    if (responseJson.errors) {
      return { 
        error: responseJson.errors, 
        data: responseJson.data || null,
        graphqlErrors: true
      };
    }

    return { data: responseJson.data, success: true };
  } catch (error) {
    // More detailed error information
    return { 
      error: error.message || "GraphQL query failed",
      errorDetails: error.stack || error.toString(),
      errorName: error.name
    };
  }
};

export default function TestGraphQL() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [query, setQuery] = useState(
    `#graphql
{
  webhookSubscriptions(first: 20) {
    edges {
      node {
        id
        topic
        callbackUrl
        createdAt
        format
      }
    }
  }
}`
  );

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetcher.submit({ query }, { method: "POST" });
  };

  return (
    <s-page heading="GraphQL Test">
      <s-section heading="Test GraphQL Queries">
        <s-paragraph>
          Use this page to test GraphQL queries against the Shopify Admin API.
          The default query shows all webhook subscriptions.
        </s-paragraph>

        <form onSubmit={handleSubmit}>
          <s-stack direction="block" gap="base">
            <s-box>
              <s-label for="query">GraphQL Query</s-label>
              <textarea
                id="query"
                name="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "200px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  padding: "12px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                placeholder="Enter your GraphQL query here..."
              />
            </s-box>

            <s-button type="submit" loading={isLoading}>
              Run Query
            </s-button>
          </s-stack>
        </form>

        {fetcher.data && (
          <s-section heading="Results">
            {fetcher.data.error && (
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="critical-subdued"
                marginBlockStart="base"
              >
                <s-heading level="3">Error</s-heading>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  <code>
                    {typeof fetcher.data.error === "string"
                      ? fetcher.data.error
                      : JSON.stringify(fetcher.data.error, null, 2)}
                  </code>
                </pre>
                {fetcher.data.errorDetails && (
                  <details style={{ marginTop: "12px" }}>
                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                      Error Details
                    </summary>
                    <pre style={{ margin: "8px 0 0 0", whiteSpace: "pre-wrap", fontSize: "12px" }}>
                      <code>{fetcher.data.errorDetails}</code>
                    </pre>
                  </details>
                )}
                {fetcher.data.status && (
                  <s-text tone="critical" style={{ display: "block", marginTop: "8px" }}>
                    HTTP Status: {fetcher.data.status}
                  </s-text>
                )}
              </s-box>
            )}

            {fetcher.data.data && (
              <s-box
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background="subdued"
                marginBlockStart="base"
              >
                <s-heading level="3">Response Data</s-heading>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  <code>{JSON.stringify(fetcher.data.data, null, 2)}</code>
                </pre>
              </s-box>
            )}

            {fetcher.data.success && (
              <s-box marginBlockStart="base">
                <s-text tone="success">Query executed successfully!</s-text>
              </s-box>
            )}
          </s-section>
        )}
      </s-section>

      <s-section slot="aside" heading="Quick Queries">
        <s-stack direction="block" gap="base">
          <s-button
            variant="tertiary"
            onClick={() =>
              setQuery(`#graphql
{
  webhookSubscriptions(first: 20) {
    edges {
      node {
        id
        topic
        callbackUrl
        createdAt
        format
      }
    }
  }
}`)
            }
          >
            Webhook Subscriptions
          </s-button>

          <s-button
            variant="tertiary"
            onClick={() =>
              setQuery(`#graphql
{
  shop {
    name
    myshopifyDomain
    plan {
      displayName
    }
  }
}`)
            }
          >
            Shop Info
          </s-button>

          <s-button
            variant="tertiary"
            onClick={() =>
              setQuery(`#graphql
{
  products(first: 5) {
    edges {
      node {
        id
        title
        handle
      }
    }
  }
}`)
            }
          >
            Products (first 5)
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
