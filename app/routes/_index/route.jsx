import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 30%, #fff7ed 100%)",
      padding: "2rem 1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: "1200px",
        width: "100%",
        background: "#ffffff",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(22, 160, 133, 0.15), 0 0 0 1px rgba(22, 160, 133, 0.1)",
        padding: "0",
        overflow: "hidden"
      }}>
        {/* Hero Section */}
        <div style={{
          background: "#f8fafc",
          padding: "4rem 2rem",
          textAlign: "center",
          color: "#1f2937",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <div style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "200px",
            height: "200px",
            background: "rgba(22, 160, 133, 0.05)",
            borderRadius: "50%"
          }}></div>
          <div style={{
            position: "absolute",
            bottom: "-30px",
            left: "-30px",
            width: "150px",
            height: "150px",
            background: "rgba(22, 160, 133, 0.03)",
            borderRadius: "50%"
          }}></div>
          
          {/* Wylto Logo */}
          <div style={{
            marginBottom: "2rem",
            position: "relative",
            zIndex: 1
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "1rem",
              background: "white",
              padding: "1rem 2rem",
              borderRadius: "16px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb"
            }}>
              <img 
                src="https://cdn.cmsfly.com/6469b4cdc6475c01091b3091/logov2-WMv8SE.png" 
                alt="Wylto Logo"
                style={{
                  height: "48px",
                  width: "auto",
                  objectFit: "contain"
                }}
              />
            </div>
          </div>
          
          <div style={{
            fontSize: "4rem",
            marginBottom: "1.5rem",
            filter: "drop-shadow(0 4px 12px rgba(22, 160, 133, 0.2))",
            animation: "pulse 2s ease-in-out infinite",
            position: "relative",
            zIndex: 1
          }}>💬</div>
          
          <h1 style={{
            fontSize: "3rem",
            fontWeight: "800",
            margin: "0 0 1.25rem 0",
            color: "#1f2937",
            position: "relative",
            zIndex: 1,
            lineHeight: "1.2"
          }}>WhatsApp Integration for Shopify</h1>
          
          <p style={{
            fontSize: "1.25rem",
            margin: "0",
            color: "#6b7280",
            maxWidth: "700px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: "1.7",
            position: "relative",
            zIndex: 1,
            paddingTop: "0.5rem"
          }}>
            Connect your Shopify store with WhatsApp. Send automated order confirmations, 
            shipping updates, and cart recovery messages directly to your customers.
          </p>
          
          {/* Trust Badge */}
          <div style={{
            marginTop: "2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            fontSize: "0.9rem",
            color: "#6b7280",
            position: "relative",
            zIndex: 1
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L12.09 7.26L18 8.27L14 12.14L14.91 18.02L10 15.77L5.09 18.02L6 12.14L2 8.27L7.91 7.26L10 2Z" fill="#16a085" opacity="0.8"/>
            </svg>
            <span>Powered by Wylto API • Secure & Reliable</span>
          </div>
        </div>

        {/* Login Section */}
        {showForm && (
          <div style={{
            padding: "3rem 2rem",
            background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)"
          }}>
            <Form method="post" action="/auth/login" style={{
              maxWidth: "600px",
              margin: "0 auto"
            }}>
              <div style={{
                background: "white",
                padding: "2rem",
                borderRadius: "16px",
                boxShadow: "0 8px 24px rgba(22, 160, 133, 0.15)",
                    border: "2px solid #16a085"
              }}>
                <label style={{
                  display: "block",
                  marginBottom: "1rem"
                }}>
                  <span style={{
                    display: "block",
                    fontWeight: "600",
                    color: "#1f2937",
                    marginBottom: "0.5rem",
                    fontSize: "1rem"
                  }}>Enter your Shopify store domain</span>
                  <input 
                    type="text" 
                    name="shop" 
                    placeholder="your-store.myshopify.com"
                    required
                    style={{
                      width: "100%",
                      padding: "1rem",
                      border: "2px solid #d1d5db",
                      borderRadius: "10px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      transition: "all 0.3s ease"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#16a085";
                      e.target.style.boxShadow = "0 0 0 4px rgba(22, 160, 133, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <span style={{
                    display: "block",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginTop: "0.5rem"
                  }}>e.g: my-shop-domain.myshopify.com</span>
                </label>
                <button 
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "1rem 2rem",
                    background: "linear-gradient(135deg, #16a085 0%, #138d75 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 6px 20px rgba(22, 160, 133, 0.4)",
                    transition: "all 0.3s ease",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 8px 24px rgba(22, 160, 133, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 6px 20px rgba(22, 160, 133, 0.4)";
                  }}
                >
                  Connect Store →
                </button>
              </div>
            </Form>
          </div>
        )}

        {/* Features Section */}
        <div style={{
          padding: "4rem 2rem",
          background: "white"
        }}>
          <div style={{
            textAlign: "center",
            marginBottom: "3rem"
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1rem"
            }}>
              <img 
                src="https://cdn.cmsfly.com/6469b4cdc6475c01091b3091/logov2-WMv8SE.png" 
                alt="Wylto"
                style={{
                  height: "32px",
                  width: "auto",
                  objectFit: "contain"
                }}
              />
              <h2 style={{
                fontSize: "2.5rem",
                fontWeight: "800",
                margin: 0,
                background: "linear-gradient(135deg, #1f2937 0%, #16a085 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                Key Features
              </h2>
            </div>
            <div style={{
              width: "80px",
              height: "5px",
              background: "linear-gradient(90deg, #16a085 0%, #138d75 100%)",
              borderRadius: "3px",
              margin: "0 auto"
            }}></div>
          </div>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            marginTop: "3rem"
          }}>
            {[
              {
                icon: "📦",
                title: "Order Notifications",
                desc: "Automatically send WhatsApp confirmations when customers place orders, with order details and tracking information."
              },
              {
                icon: "🚚",
                title: "Shipping Updates",
                desc: "Keep customers informed with real-time shipping notifications, tracking numbers, and delivery updates."
              },
              {
                icon: "🛒",
                title: "Cart Recovery",
                desc: "Re-engage customers with abandoned cart recovery messages to boost conversions and sales."
              },
              {
                icon: "⚙️",
                title: "Easy Setup",
                desc: "Simple configuration through your Shopify admin. Connect your Wylto account in minutes and start sending messages."
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                  padding: "2rem",
                  borderRadius: "16px",
                  border: "2px solid #e5e7eb",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 16px 32px rgba(22, 160, 133, 0.2)";
                  e.currentTarget.style.borderColor = "#16a085";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "5px",
                  height: "100%",
                  background: "#16a085",
                  transform: "scaleY(0)",
                  transition: "transform 0.3s ease"
                }} className="feature-accent"></div>
                
                <div style={{
                  width: "60px",
                  height: "60px",
                  background: "linear-gradient(135deg, #16a085 0%, #138d75 100%)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  marginBottom: "1.5rem",
                  boxShadow: "0 6px 16px rgba(22, 160, 133, 0.3)"
                }}>{feature.icon}</div>
                
                <h3 style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#1f2937",
                  margin: "0 0 1rem 0",
                  lineHeight: "1.3"
                }}>{feature.title}</h3>
                
                <p style={{
                  fontSize: "1rem",
                  color: "#6b7280",
                  lineHeight: "1.7",
                  margin: "0",
                  paddingTop: "0.25rem"
                }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
          padding: "2rem",
          textAlign: "center",
          borderTop: "2px solid #f0fdf4"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            color: "#6b7280",
            fontSize: "0.95rem"
          }}>
            <img 
              src="https://cdn.cmsfly.com/6469b4cdc6475c01091b3091/logov2-WMv8SE.png" 
              alt="Wylto"
              style={{
                height: "24px",
                width: "auto",
                objectFit: "contain"
              }}
            />
            <span>Secure integration powered by <strong style={{ color: "#16a085" }}>Wylto</strong> • Built for Shopify merchants</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .feature-accent {
          transition: transform 0.3s ease !important;
        }
        div:hover .feature-accent {
          transform: scaleY(1) !important;
        }
      `}</style>
    </div>
  );
}
