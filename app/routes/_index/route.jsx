import { redirect } from "react-router";
import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../../shopify.server";
import { getStoreByShopDomain, updateStoreConfig } from "../../store.server";

/**
 * Landing page - Wylto Account Connection
 * 
 * This page appears after users install the app from the Shopify App Store.
 * It allows users to connect their existing Wylto account or learn about getting one.
 */

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // If shop parameter exists, redirect to app (OAuth flow)
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  // Try to authenticate - if not authenticated, redirect to login
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    // Load current Store configuration
    const store = await getStoreByShopDomain(shopDomain);

    return {
      shopDomain,
      hasApiKey: !!store?.wyltoApiKey,
      hasAccountId: !!store?.wyltoAccountId,
      isConfigured: !!(store?.wyltoApiKey && store?.wyltoAccountId && store?.isActive),
    };
  } catch (error) {
    // Not authenticated - redirect to login
    throw redirect("/auth/login");
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const wyltoApiKey = formData.get("wyltoApiKey")?.toString().trim() || "";
  const wyltoAccountId = formData.get("wyltoAccountId")?.toString().trim() || "";
  const actionType = formData.get("actionType")?.toString() || "";

  // Test connection action
  if (actionType === "test") {
    if (!wyltoApiKey) {
      return {
        success: false,
        error: "Please enter your Wylto API key to test the connection.",
      };
    }
    // TODO: Add actual API test call here
    return {
      success: true,
      message: "Connection test successful!",
    };
  }

  // Save connection action
  if (actionType === "save") {
    if (!wyltoApiKey || !wyltoAccountId) {
      return {
        success: false,
        error: "Both API Key and Account ID are required.",
      };
    }

    try {
      await updateStoreConfig(shopDomain, {
        wyltoApiKey,
        wyltoAccountId,
        isActive: true,
      });

      return {
        success: true,
        message: "Wylto account connected successfully!",
        redirect: "/app",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Failed to connect Wylto account.",
      };
    }
  }

  return {
    success: false,
    error: "Invalid action.",
  };
};

export default function WyltoConnection() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const [wyltoApiKey, setWyltoApiKey] = useState("");
  const [wyltoAccountId, setWyltoAccountId] = useState("");
  const [showAccountId, setShowAccountId] = useState(false);
  const [actionType, setActionType] = useState("");

  const actionData = fetcher.data;
  const isLoading = fetcher.state === "submitting";

  // Handle redirect after successful connection
  useEffect(() => {
    if (actionData?.success && actionData?.redirect) {
      window.location.href = actionData.redirect;
    }
  }, [actionData]);

  const handleSubmit = (e, type) => {
    e.preventDefault();
    setActionType(type);
    const formData = new FormData();
    formData.append("wyltoApiKey", wyltoApiKey);
    formData.append("wyltoAccountId", wyltoAccountId);
    formData.append("actionType", type);
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <>
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
          gap: "3rem"
        }}>
          {/* Top Section: Connect Your Wylto Account */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <h1 style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: "0",
              lineHeight: "1.3"
            }}>
              Connect Your Wylto Account
            </h1>

            <p style={{
              fontSize: "1rem",
              color: "#4b5563",
              margin: "0",
              lineHeight: "1.6"
            }}>
              Enter your Wylto API key to start automating WhatsApp messages for order confirmations, shipping updates, and cart recovery.
            </p>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                <label htmlFor="wyltoApiKey" style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#1f2937"
                }}>
                  Wylto API Key
                </label>
                <input
                  id="wyltoApiKey"
                  type="password"
                  value={wyltoApiKey}
                  onChange={(e) => setWyltoApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "0.9375rem",
                    color: "#1f2937",
                    outline: "none",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#16a085"}
                  onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                />
                <p style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  margin: "0",
                  lineHeight: "1.5"
                }}>
                  Find this in your Wylto Dashboard → Settings → API Keys.
                </p>
              </div>

              {showAccountId && (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}>
                  <label htmlFor="wyltoAccountId" style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#1f2937"
                  }}>
                    Wylto Account ID
                  </label>
                  <input
                    id="wyltoAccountId"
                    type="text"
                    value={wyltoAccountId}
                    onChange={(e) => setWyltoAccountId(e.target.value)}
                    placeholder="Enter your Account ID"
                    disabled={isLoading}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.9375rem",
                      color: "#1f2937",
                      outline: "none",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#16a085"}
                    onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                  />
                </div>
              )}

              {actionData?.error && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "0.875rem"
                }}>
                  {actionData.error}
                </div>
              )}

              {actionData?.success && !actionData?.redirect && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "8px",
                  color: "#16a34a",
                  fontSize: "0.875rem"
                }}>
                  {actionData.message}
                </div>
              )}

              <div style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap"
              }}>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, "test")}
                  disabled={isLoading || !wyltoApiKey}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#ffffff",
                    color: "#1f2937",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "0.9375rem",
                    fontWeight: "500",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.6 : 1,
                    transition: "all 0.2s",
                    flex: "1",
                    minWidth: "140px"
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.target.style.borderColor = "#9ca3af";
                      e.target.style.background = "#f9fafb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.background = "#ffffff";
                    }
                  }}
                >
                  {isLoading && actionType === "test" ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    if (!showAccountId) {
                      setShowAccountId(true);
                      setTimeout(() => {
                        document.getElementById("wyltoAccountId")?.focus();
                      }, 100);
                    } else {
                      handleSubmit(e, "save");
                    }
                  }}
                  disabled={isLoading || !wyltoApiKey || (showAccountId && !wyltoAccountId)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#16a085",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.9375rem",
                    fontWeight: "600",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.6 : 1,
                    transition: "all 0.2s",
                    flex: "1",
                    minWidth: "140px"
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.target.style.background = "#138d75";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.target.style.background = "#16a085";
                    }
                  }}
                >
                  {isLoading && actionType === "save" ? "Connecting..." : "Connect Account"}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Don't have a Wylto account? */}
          <div style={{
            paddingTop: "2rem",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <h2 style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: "0",
              lineHeight: "1.3"
            }}>
              Don't have a Wylto account?
            </h2>

            <p style={{
              fontSize: "1rem",
              color: "#4b5563",
              margin: "0",
              lineHeight: "1.6"
            }}>
              Wylto provides WhatsApp Business API with automated messaging for Shopify stores. Get started with:
            </p>

            <ul style={{
              margin: "0",
              paddingLeft: "1.5rem",
              fontSize: "1rem",
              color: "#4b5563",
              lineHeight: "1.8",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}>
              <li>Automated order confirmations</li>
              <li>Real-time shipping notifications</li>
              <li>Abandoned cart recovery</li>
              <li>100% template compliance</li>
            </ul>

            <a
              href="https://wylto.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                background: "#ffffff",
                color: "#1f2937",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                fontWeight: "500",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                width: "fit-content"
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#9ca3af";
                e.target.style.background = "#f9fafb";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.background = "#ffffff";
              }}
            >
              Get Wylto Account →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
