import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  checkConnectionStatus,
  getTemplates,
  getAutomations,
  saveAutomations,
} from "../wylto-connection.server";

/**
 * Automations page
 *
 * Lets a merchant choose which WhatsApp template fires for each order status,
 * and enable/disable each one — all inside the Shopify admin.
 */

// Order stages Wylto can react to. These keys are the ones the Shopify Order
// Update trigger supports in Wylto — sending anything else is rejected with
// "Unknown order status". Abandoned cart is deliberately absent: it is a
// separate trigger in Wylto, not an order status.
// `verified: false` marks a status whose key the backend has not confirmed.
// Those are only sent when the merchant actually enables them, so an
// unrecognised key can never break a save for someone not using that stage —
// the backend rejects the whole request on the first status it doesn't know.
const ORDER_STATUSES = [
  { key: "created", label: "Order placed" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Order cancelled" },
  { key: "abandonedCart", label: "Abandoned cart", verified: false },
];

// Defensive field access — the get-templates response shape is still being
// confirmed, so accept the likely field names with fallbacks.
const templateId = (t) => t.id ?? t.templateId ?? t.name ?? t.templateName ?? "";
const templateName = (t) => t.name ?? t.templateName ?? templateId(t);
const templateStatus = (t) => (t.status ?? t.approvalStatus ?? "").toString().toUpperCase();
// Only approved templates can actually send, so they are the only ones offered
// here. A template awaiting Meta's approval comes back with no status.
const isApproved = (t) => templateStatus(t) === "APPROVED";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let connected = false;
  let templates = [];
  let automations = [];

  try {
    const status = await checkConnectionStatus(shop);
    connected = status.connected === true;
  } catch {
    connected = false;
  }

  if (connected) {
    const [tRes, aRes] = await Promise.all([getTemplates(shop), getAutomations(shop)]);
    if (tRes.success) templates = tRes.templates;
    if (aRes.success) automations = aRes.automations;
  }

  return { shop, connected, templates, automations };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const raw = formData.get("automations")?.toString() || "[]";

  let automations;
  try {
    automations = JSON.parse(raw);
  } catch {
    return { success: false, error: "Could not read the automation settings." };
  }

  const result = await saveAutomations(shop, automations);
  if (!result.success) {
    return { success: false, error: result.error || "Failed to save automations." };
  }
  return { success: true, message: "Automations saved." };
};

export default function Automations() {
  const { connected, templates, automations } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isSaving = fetcher.state === "submitting";

  // Build the initial per-status state from whatever the backend returned.
  const byStatus = {};
  for (const a of automations) {
    if (a && a.status) {
      byStatus[a.status] = {
        enabled: a.enabled === true,
        templateId: a.templateId ?? "",
      };
    }
  }

  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      ORDER_STATUSES.map((s) => [
        s.key,
        {
          enabled: byStatus[s.key]?.enabled ?? false,
          templateId: byStatus[s.key]?.templateId ?? "",
        },
      ]),
    ),
  );

  const setRow = (key, patch) =>
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleSave = () => {
    const payload = ORDER_STATUSES.filter(
      (s) => s.verified !== false || rows[s.key].enabled,
    ).map((s) => ({
      status: s.key,
      enabled: rows[s.key].enabled,
      templateId: rows[s.key].templateId || undefined,
    }));
    const formData = new FormData();
    formData.append("automations", JSON.stringify(payload));
    fetcher.submit(formData, { method: "POST" });
  };

  // Surface the save result as a toast once, when the fetcher settles.
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.success) {
      shopify.toast.show(fetcher.data.message || "Saved");
    } else if (fetcher.data.error) {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.state, fetcher.data, shopify]);

  if (!connected) {
    return (
      <s-page heading="Automations">
        <s-section heading="Connect Wylto first">
          <s-paragraph>
            Connect your Wylto account on the Home page to set up automations.
          </s-paragraph>
          <s-link href="/app">
            <s-button variant="primary">Go to Home</s-button>
          </s-link>
        </s-section>
      </s-page>
    );
  }

  const approvedTemplates = templates.filter(isApproved);
  const noTemplates = approvedTemplates.length === 0;

  return (
    <s-page heading="Automations">
      <s-section heading="Order updates">
        <s-paragraph>
          Choose which WhatsApp template is sent at each stage of an order, and turn
          each update on or off. Changes apply after you save.
        </s-paragraph>

        {noTemplates && (
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="caution-subdued"
            marginBlockStart="base"
          >
            <s-text tone="caution">
              No approved templates yet. Create one on the Templates page first — you can
              still enable a stage, but it won&apos;t send until an approved template is chosen.
            </s-text>
          </s-box>
        )}

        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {ORDER_STATUSES.map((s) => {
            const row = rows[s.key];
            return (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  border: "1px solid #e3e3e3",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  background: row.enabled ? "#ffffff" : "#fafafa",
                  flexWrap: "wrap",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => setRow(s.key, { enabled: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "#3cb45a", cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a1a" }}>{s.label}</span>
                </label>

                <select
                  value={row.templateId}
                  onChange={(e) => setRow(s.key, { templateId: e.target.value })}
                  disabled={!row.enabled}
                  style={{
                    minWidth: "220px",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13.5px",
                    background: row.enabled ? "#ffffff" : "#f1f1f1",
                    color: row.enabled ? "#1a1a1a" : "#8a8a8a",
                  }}
                >
                  <option value="">Select a template…</option>
                  {approvedTemplates.map((t) => (
                    <option key={templateId(t)} value={templateId(t)}>
                      {templateName(t)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <s-stack direction="inline" gap="base" marginBlockStart="base">
          <s-button variant="primary" onClick={handleSave} loading={isSaving} disabled={isSaving}>
            Save automations
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
