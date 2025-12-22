import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  // Format shop domain helper
  const handleShopChange = (e) => {
    let value = e.currentTarget.value.trim().toLowerCase();
    // Auto-format: if user types without .myshopify.com, suggest it
    if (value && !value.includes(".") && !value.includes(" ")) {
      // Don't auto-add, just let them type
    }
    setShop(value);
  };

  return (
    <AppProvider embedded={false}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
      <s-page>
        <div style={{ 
          maxWidth: "500px", 
          margin: "0 auto", 
          padding: "2rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #fff7ed 100%)",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {/* Header */}
          <div style={{ 
            textAlign: "center", 
            marginBottom: "1rem",
            background: "white",
            padding: "2rem",
            borderRadius: "16px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(22, 160, 133, 0.1)",
            width: "100%"
          }}>
            {/* Wylto Logo */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              background: "rgba(22, 160, 133, 0.1)",
              padding: "0.75rem 1.5rem",
              borderRadius: "12px"
            }}>
              <img 
                src="https://cdn.cmsfly.com/6469b4cdc6475c01091b3091/logov2-WMv8SE.png" 
                alt="Wylto Logo"
                style={{
                  height: "40px",
                  width: "auto",
                  objectFit: "contain"
                }}
              />
            </div>
            
            <div style={{ 
              fontSize: "3rem", 
              marginBottom: "1.25rem", 
              color: "#16a085",
              filter: "drop-shadow(0 4px 8px rgba(22, 160, 133, 0.3))",
              animation: "pulse 2s ease-in-out infinite"
            }}>💬</div>
            
            <h1 style={{ 
              fontSize: "1.75rem", 
              fontWeight: "700", 
              background: "linear-gradient(135deg, #1f2937 0%, #16a085 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              margin: "0 0 1rem 0",
              lineHeight: "1.3"
            }}>
              Connect Your Shopify Store
            </h1>
            
            <p style={{ 
              color: "#6b7280", 
              fontSize: "0.95rem",
              margin: "0",
              lineHeight: "1.6",
              paddingTop: "0.5rem"
            }}>
              Enter your store domain to connect with Wylto WhatsApp integration
            </p>
          </div>

          {/* Login Form */}
          <Form method="post" style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "1.5rem",
            background: "white",
            padding: "2rem",
            borderRadius: "16px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
            border: "2px solid #16a085",
            width: "100%"
          }}>
            <s-section>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <s-text-field
                  name="shop"
                  label="Shop domain"
                  placeholder="your-store.myshopify.com"
                  value={shop}
                  onChange={handleShopChange}
                  autocomplete="on"
                  error={errors.shop}
                  required
                >
                  <s-text tone="subdued" slot="helpText">
                    Enter your Shopify store domain (e.g., my-store.myshopify.com)
                  </s-text>
                </s-text-field>

                <s-button 
                  type="submit" 
                  variant="primary"
                  style={{ width: "100%" }}
                >
                  Connect Store
                </s-button>
              </div>
            </s-section>
          </Form>

          {/* Help Section */}
          <div style={{ 
            marginTop: "1rem",
            padding: "1.5rem",
            background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
            borderRadius: "12px",
            border: "2px solid #fed7aa",
            boxShadow: "0 4px 12px rgba(255, 152, 0, 0.15)",
            width: "100%"
          }}>
            <s-text tone="subdued" style={{ fontSize: "0.875rem", display: "block", marginBottom: "0.75rem", fontWeight: "600", marginTop: "0" }}>
              <strong>Need help?</strong>
            </s-text>
            <s-text tone="subdued" style={{ fontSize: "0.875rem", display: "block", lineHeight: "1.6", marginTop: "0" }}>
              Your shop domain is the URL you use to access your Shopify admin. 
              It typically ends with <code style={{ background: "#e5e7eb", padding: "0.125rem 0.25rem", borderRadius: "4px" }}>.myshopify.com</code>
            </s-text>
          </div>

          {/* Features Preview */}
          <div style={{ 
            marginTop: "1rem",
            padding: "1.5rem",
            background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
            borderRadius: "12px",
            border: "2px solid #16a085",
            boxShadow: "0 4px 12px rgba(22, 160, 133, 0.15)",
            width: "100%"
          }}>
            <s-text tone="subdued" style={{ fontSize: "0.875rem", display: "block", marginBottom: "1rem", fontWeight: "600" }}>
              <strong>What you'll get:</strong>
            </s-text>
            <ul style={{ 
              margin: 0, 
              paddingLeft: "0", 
              fontSize: "0.875rem",
              color: "#6b7280",
              lineHeight: "1.8",
              listStyle: "none"
            }}>
              <li style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#16a085", fontSize: "1rem", fontWeight: "bold" }}>✓</span>
                Automated WhatsApp order confirmations
              </li>
              <li style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#16a085", fontSize: "1rem", fontWeight: "bold" }}>✓</span>
                Shipping and tracking notifications
              </li>
              <li style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "#16a085", fontSize: "1rem", fontWeight: "bold" }}>✓</span>
                Abandoned cart recovery messages
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0" }}>
                <span style={{ color: "#16a085", fontSize: "1rem", fontWeight: "bold" }}>✓</span>
                Easy setup and configuration
              </li>
            </ul>
          </div>
        </div>
      </s-page>
    </AppProvider>
  );
}
