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

/**
 * Fixed template definitions.
 *
 * The message body is not free text. A workflow created through
 * /api/shopify/automations receives only a templateId — there is nowhere to
 * say what {{1}} and {{2}} mean — so the backend has to infer the parameters
 * from the template itself. If merchants could write their own body, the
 * placeholder count would drift from what the backend fills and Meta would
 * reject the send with "number of localizable_params does not match".
 *
 * Keeping the bodies fixed means the mapping below is the contract: the
 * position of each entry in `params` is the placeholder it fills.
 */
const TEMPLATE_TYPES = [
  {
    key: "order_placed",
    label: "Order placed",
    category: "UTILITY",
    suggestedName: "order_placed_update",
    header: "Order confirmed",
    body: "Hi {{1}}, thank you for your order {{2}}. We have received it and will notify you as soon as it ships. Thanks for shopping with us!",
    footer: "Powered by Wylto",
    params: ["name", "orderId"],
  },
  {
    key: "order_delivered",
    label: "Delivered",
    category: "UTILITY",
    suggestedName: "order_delivered_update",
    header: "Order delivered",
    body: "Hi {{1}}, your order {{2}} has been delivered. We hope you love it! If you have any questions or need help with your purchase, feel free to reach out to us anytime.",
    footer: "Powered by Wylto",
    params: ["name", "orderId"],
  },
  {
    key: "order_cancelled",
    label: "Order cancelled",
    category: "UTILITY",
    suggestedName: "order_cancelled_update",
    header: "Order cancelled",
    body: "Hi {{1}}, your order {{2}} has been cancelled. If this was not expected or you need any assistance, please reach out to us and we will be happy to help.",
    footer: "Powered by Wylto",
    params: ["name", "orderId"],
  },
  {
    key: "abandoned_cart",
    label: "Abandoned cart",
    category: "MARKETING",
    suggestedName: "abandoned_cart_reminder",
    header: "You left something behind",
    body: "Hi {{1}}, you still have items waiting in your cart. Complete your order before they run out — and let us know if you need any help choosing.",
    footer: "Powered by Wylto",
    params: ["name"],
  },
];

const templateTypeByKey = (key) => TEMPLATE_TYPES.find((t) => t.key === key);

/** Human label for a variable, used to explain the placeholders. */
const PARAM_LABELS = {
  name: "customer name",
  orderId: "order number",
  totalAmount: "order total",
  productNames: "product names",
};

/** Builds the Meta component array for a fixed template type. */
function buildComponents(type) {
  const components = [];
  if (type.header) {
    components.push({ type: "HEADER", format: "TEXT", text: type.header });
  }
  const body = { type: "BODY", text: type.body };
  if (type.params.length) {
    // Meta requires a sample value per {{n}} placeholder.
    body.example = { body_text: [type.params.map((p) => PARAM_LABELS[p] || p)] };
  }
  components.push(body);
  if (type.footer) {
    components.push({ type: "FOOTER", text: type.footer });
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
  const language = formData.get("language")?.toString().trim() || "en_US";
  const typeKey = formData.get("templateType")?.toString() || "";

  // The body comes from the fixed definition, never from the request, so the
  // placeholders always match what the backend fills in.
  const type = templateTypeByKey(typeKey);
  if (!type) {
    return { success: false, error: "Choose a template type." };
  }
  if (!name) {
    return { success: false, error: "Template name is required." };
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
    category: type.category,
    components: buildComponents(type),
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

  const emptyForm = { templateType: "", name: "", language: "en_US" };
  const [form, setForm] = useState(emptyForm);
  const selectedType = templateTypeByKey(form.templateType);

  const isSubmitting = fetcher.state === "submitting";
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // Picking a type suggests a matching name, which the merchant can still change.
  const onTypeChange = (key) => {
    const t = templateTypeByKey(key);
    setForm((prev) => ({ ...prev, templateType: key, name: t ? t.suggestedName : prev.name }));
  };

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.success) {
      shopify.toast.show(fetcher.data.message || "Saved");
      setForm({ templateType: "", name: "", language: "en_US" });
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
          Choose the update you want to send. The message wording is fixed so the order
          details fill in correctly when it&apos;s sent. Templates go to Meta for approval and
          can be used in automations once approved.
        </s-paragraph>

        <s-stack direction="block" gap="base" marginBlockStart="base">
          <div>
            <s-label>Template type</s-label>
            <select
              style={inputStyle}
              value={form.templateType}
              onChange={(e) => onTypeChange(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Choose a template type…</option>
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div
              style={{
                border: "1px solid #e3e3e3",
                borderRadius: "12px",
                padding: "16px",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#8a8a8a",
                  marginBottom: "10px",
                }}
              >
                Message preview
              </div>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8e8e8",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "13.5px",
                  lineHeight: 1.55,
                  color: "#1a1a1a",
                  maxWidth: "460px",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "6px" }}>{selectedType.header}</div>
                <div>{selectedType.body}</div>
                <div style={{ color: "#8a8a8a", fontSize: "12px", marginTop: "8px" }}>
                  {selectedType.footer}
                </div>
              </div>
              <div style={{ fontSize: "12.5px", color: "#616161", marginTop: "10px" }}>
                {selectedType.params.length > 0 ? (
                  <>
                    Filled in automatically:{" "}
                    {selectedType.params.map((p, i) => (
                      <span key={p}>
                        {i > 0 && " · "}
                        <strong>{`{{${i + 1}}}`}</strong> {PARAM_LABELS[p] || p}
                      </span>
                    ))}
                  </>
                ) : (
                  "No dynamic values in this message."
                )}
                <span style={{ marginLeft: "8px" }}>· Category: {selectedType.category}</span>
              </div>
            </div>
          )}

          <div>
            <s-label>Template name</s-label>
            <input
              style={inputStyle}
              placeholder="order_placed_update"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={isSubmitting || !selectedType}
            />
            <s-text tone="subdued" style={{ fontSize: "12px" }}>
              Lowercase letters, numbers and underscores only. Must be unique.
            </s-text>
          </div>

          <div style={{ maxWidth: "220px" }}>
            <s-label>Language</s-label>
            <input
              style={inputStyle}
              placeholder="en_US"
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              disabled={isSubmitting || !selectedType}
            />
          </div>

          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              onClick={handleCreate}
              loading={isSubmitting}
              disabled={isSubmitting || !selectedType || !form.name}
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
