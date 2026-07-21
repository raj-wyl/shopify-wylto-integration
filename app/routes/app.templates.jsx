import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { checkConnectionStatus, getTemplates, createTemplate } from "../wylto-connection.server";

/**
 * Templates page
 *
 * Lists the shop's WhatsApp templates and lets the merchant create a new one
 * (submitted to Meta for approval) — all inside the Shopify admin.
 */

// Defensive field access — the get-templates response shape is still being
// confirmed, so accept the likely field names with fallbacks.
const tName = (t) => t.name ?? t.templateName ?? t.id ?? t.templateId ?? "Untitled";
// A freshly created template comes back with no status until Meta reviews it,
// so treat "no status" as pending rather than showing nothing.
const tStatus = (t) =>
  (t.status ?? t.approvalStatus ?? "").toString().toUpperCase() || "PENDING";
const tCategory = (t) => (t.category ?? "").toString().toUpperCase();

function statusColors(status) {
  if (status === "APPROVED") return { bg: "#e7f6ec", fg: "#0f7a3d" };
  if (status === "REJECTED") return { bg: "#fdecec", fg: "#b42318" };
  return { bg: "#fff5e5", fg: "#b25e02" };
}

const statusLabel = (status) => (status === "PENDING" ? "PENDING APPROVAL" : status);

/** Builds the Meta component array from the simple form fields. */
function buildComponents({ headerText, bodyText, footerText }) {
  const components = [];
  if (headerText) {
    components.push({ type: "HEADER", format: "TEXT", text: headerText });
  }
  const body = { type: "BODY", text: bodyText };
  const vars = bodyText.match(/\{\{\d+\}\}/g) || [];
  if (vars.length) {
    // Meta requires a sample value per {{n}} placeholder.
    body.example = { body_text: [vars.map((_, i) => `Sample ${i + 1}`)] };
  }
  components.push(body);
  if (footerText) {
    components.push({ type: "FOOTER", text: footerText });
  }
  return components;
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let connected = false;
  let templates = [];
  try {
    const status = await checkConnectionStatus(shop);
    connected = status.connected === true;
  } catch {
    connected = false;
  }

  if (connected) {
    const res = await getTemplates(shop);
    if (res.success) templates = res.templates;
  }

  return { shop, connected, templates };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const name = formData.get("name")?.toString().trim() || "";
  const category = formData.get("category")?.toString() || "UTILITY";
  const language = formData.get("language")?.toString().trim() || "en_US";
  const headerText = formData.get("headerText")?.toString().trim() || "";
  const bodyText = formData.get("bodyText")?.toString().trim() || "";
  const footerText = formData.get("footerText")?.toString().trim() || "";

  if (!name || !bodyText) {
    return { success: false, error: "Template name and body are required." };
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    return {
      success: false,
      error: "Template name can only use lowercase letters, numbers, and underscores.",
    };
  }

  const template = {
    name,
    language,
    category,
    components: buildComponents({ headerText, bodyText, footerText }),
  };

  const result = await createTemplate(shop, template);
  if (!result.success) {
    return { success: false, error: result.error || "Failed to create template." };
  }
  return {
    success: true,
    message: "Template created — waiting for approval from Meta. This usually takes a few minutes.",
  };
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.7rem 0.9rem",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "0.9rem",
  color: "#1f2937",
  outline: "none",
};

export default function Templates() {
  const { connected, templates } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [form, setForm] = useState({
    name: "",
    category: "UTILITY",
    language: "en_US",
    headerText: "",
    bodyText: "",
    footerText: "",
  });

  const isSubmitting = fetcher.state === "submitting";
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.success) {
      shopify.toast.show(fetcher.data.message || "Saved");
      setForm({ name: "", category: "UTILITY", language: "en_US", headerText: "", bodyText: "", footerText: "" });
    } else if (fetcher.data.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.state, fetcher.data, shopify]);

  const handleCreate = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fetcher.submit(fd, { method: "POST" });
  };

  if (!connected) {
    return (
      <s-page heading="Templates">
        <s-section heading="Connect Wylto first">
          <s-paragraph>
            Connect your Wylto account on the Home page to manage templates.
          </s-paragraph>
          <s-link href="/app">
            <s-button variant="primary">Go to Home</s-button>
          </s-link>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Templates">
      {/* Existing templates */}
      <s-section heading="Your templates">
        {templates.length === 0 ? (
          <s-paragraph>No templates yet. Create your first one below.</s-paragraph>
        ) : (
          <>
          <s-paragraph>
            Templates awaiting Meta&apos;s approval show as <strong>Pending approval</strong> and
            can&apos;t be used in automations until they&apos;re approved.
          </s-paragraph>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
            {templates.map((t, i) => {
              const status = tStatus(t);
              const c = statusColors(status);
              return (
                <div
                  key={tName(t) + i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    border: "1px solid #e3e3e3",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a1a" }}>{tName(t)}</div>
                    {tCategory(t) && (
                      <div style={{ fontSize: "12px", color: "#8a8a8a", marginTop: "2px" }}>
                        {tCategory(t)}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      background: c.bg,
                      color: c.fg,
                      borderRadius: "999px",
                      padding: "3px 10px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {statusLabel(status)}
                  </span>
                </div>
              );
            })}
          </div>
          </>
        )}
      </s-section>

      {/* Create a template */}
      <s-section heading="Create a template">
        <s-paragraph>
          Build a WhatsApp template. It&apos;s submitted to Meta for approval and can be
          used in automations once approved. Use <s-text>{"{{1}}"}</s-text>, <s-text>{"{{2}}"}</s-text> in
          the body for dynamic values like the customer name or order number.
        </s-paragraph>

        <s-stack direction="block" gap="base" marginBlockStart="base">
          <div>
            <s-label>Template name</s-label>
            <input
              style={inputStyle}
              placeholder="order_shipped_update"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={isSubmitting}
            />
            <s-text tone="subdued" style={{ fontSize: "12px" }}>
              Lowercase letters, numbers and underscores only.
            </s-text>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px" }}>
              <s-label>Category</s-label>
              <select
                style={inputStyle}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                disabled={isSubmitting}
              >
                <option value="UTILITY">Utility</option>
                <option value="MARKETING">Marketing</option>
              </select>
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <s-label>Language</s-label>
              <input
                style={inputStyle}
                placeholder="en_US"
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <s-label>Header (optional)</s-label>
            <input
              style={inputStyle}
              placeholder="Your order has shipped!"
              value={form.headerText}
              onChange={(e) => set("headerText", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <s-label>Body</s-label>
            <textarea
              style={{ ...inputStyle, minHeight: "90px", resize: "vertical", fontFamily: "inherit" }}
              placeholder="Hi {{1}}, your order {{2}} is on its way. Track it anytime."
              value={form.bodyText}
              onChange={(e) => set("bodyText", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <s-label>Footer (optional)</s-label>
            <input
              style={inputStyle}
              placeholder="Thanks for shopping with us"
              value={form.footerText}
              onChange={(e) => set("footerText", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              onClick={handleCreate}
              loading={isSubmitting}
              disabled={isSubmitting || !form.name || !form.bodyText}
            >
              Create template
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
