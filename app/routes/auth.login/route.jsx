import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  try {
    const loginResult = await login(request);
    const errors = loginErrorMessage(loginResult);

    // eslint-disable-next-line no-undef
    return { errors, apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    // If login throws a redirect or other response, let it propagate
    throw error;
  }
};

export const action = async ({ request }) => {
  try {
    const loginResult = await login(request);
    const errors = loginErrorMessage(loginResult);

    // eslint-disable-next-line no-undef
  return {
    errors,
      apiKey: process.env.SHOPIFY_API_KEY || "",
  };
  } catch (error) {
    // If login throws a redirect or other response, let it propagate
    throw error;
  }
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors, apiKey } = actionData || loaderData;

  const handleShopChange = (e) => {
    let value = e.currentTarget.value.trim().toLowerCase();
    setShop(value);
  };

  return (
    <AppProvider embedded={false} apiKey={apiKey}>
      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
        }
      `}</style>
      <div style={{
        minHeight: "100vh",
        width: "100%",
        background: "#ffffff",
        padding: "3rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          maxWidth: "600px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <h1 style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: "0",
              lineHeight: "1.3"
            }}>
              Connect Your Shopify Store
            </h1>

            <p style={{
              fontSize: "1rem",
              color: "#4b5563",
              margin: "0",
              lineHeight: "1.6"
            }}>
              Enter your store domain to connect with Wylto WhatsApp integration.
            </p>
          </div>

          {/* Login Form */}
          <Form method="post" style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}>
              <label htmlFor="shop" style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#1f2937"
              }}>
                Shop domain
              </label>
              <input
                id="shop"
              name="shop"
                type="text"
              value={shop}
                onChange={handleShopChange}
                placeholder="your-store.myshopify.com"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: errors?.shop ? "1px solid #dc2626" : "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "0.9375rem",
                  color: "#1f2937",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#16a085"}
                onBlur={(e) => {
                  e.target.style.borderColor = errors?.shop ? "#dc2626" : "#d1d5db";
                }}
              />
              {errors?.shop && (
                <p style={{
                  fontSize: "0.875rem",
                  color: "#dc2626",
                  margin: "0"
                }}>
                  {errors.shop}
                </p>
              )}
              <p style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                margin: "0",
                lineHeight: "1.5"
              }}>
                Enter your Shopify store domain (e.g., my-store.myshopify.com)
              </p>
            </div>

            <button
              type="submit"
              style={{
                padding: "0.75rem 1.5rem",
                background: "#16a085",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                width: "100%",
                marginTop: "0.5rem"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#138d75";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#16a085";
              }}
            >
              Connect Store
            </button>
        </Form>
        </div>
      </div>
    </AppProvider>
  );
}
