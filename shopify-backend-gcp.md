# Wylto Shopify App — GCP Deployment Reference

---

## Section 1: GCP Account & Project Details

- **GCP Project:** wylto-c2964
- **Active Account:** sales@wylto.com
- **Region:** asia-south1
- **Default Compute Service Account:** 266803453994-compute@developer.gserviceaccount.com

---

## Section 2: Cloud Run Service (LIVE)

| Field | Value |
|---|---|
| Service Name | wylto-production |
| Service URL | https://wylto-production-266803453994.asia-south1.run.app |
| Shopify App URL (used in toml) | https://wylto-production-pfcaxtk5da-el.a.run.app |
| Image | gcr.io/wylto-c2964/shopify-wylto-integration:latest |
| Current Revision | wylto-production-00008-dqj (deployed May 12, 2026) |
| Previous Revision | wylto-production-00007-dl7 (deployed Jan 21, 2026) |
| CPU | 1 |
| Memory | 512MB |
| Min Instances | 0 |
| Max Instances | 10 |

---

## Section 3: Environment Variables

> These are set directly in Cloud Run as plain env vars (not via Secret Manager) and **persist across deploys**.

| Variable | Value |
|---|---|
| SHOPIFY_API_KEY | *see GCP Console → Cloud Run → wylto-production → Edit & Deploy → Variables* |
| SHOPIFY_API_SECRET | *see GCP Console → Cloud Run → wylto-production → Edit & Deploy → Variables* |
| SHOPIFY_APP_URL | https://wylto-production-pfcaxtk5da-el.a.run.app |
| WYLTO_API_TOKEN | *see GCP Console → Cloud Run → wylto-production → Edit & Deploy → Variables* |
| WYLTO_API_BASE_URL | https://server.wylto.com |

Only add `--update-env-vars` to a deploy command if you need to change a value. Otherwise, existing vars are preserved automatically.

---

## Section 4: Deployment Steps

### Pre-requisites

```bash
# Authenticate with the correct account
gcloud config set account sales@wylto.com

# Set the project
gcloud config set project wylto-c2964
```

### Step 1 — Build

```bash
gcloud builds submit --tag gcr.io/wylto-c2964/shopify-wylto-integration:latest .
```

### Step 2 — Deploy

```bash
gcloud run deploy wylto-production \
  --image gcr.io/wylto-c2964/shopify-wylto-integration:latest \
  --region asia-south1 \
  --project wylto-c2964
```

### Step 3 — Verify

```bash
gcloud run revisions list \
  --service wylto-production \
  --region asia-south1 \
  --project wylto-c2964 \
  --limit=3
```

> **Note:** Run `shopify app deploy` only if `shopify.app.toml` has changed.

---

## Section 5: Unused Services (Cleanup Later)

| Service | Created | Image | Status |
|---|---|---|---|
| wylto-shopify | Jan 7, 2026 | gcr.io/wylto-c2964/wylto-shopify:v14 | Old test service |
| wylto-shopify-production | Jan 14, 2026 | Artifact Registry image | Abandoned intermediate |

```bash
# Cleanup commands (run when ready)
gcloud run services delete wylto-shopify --region asia-south1 --project wylto-c2964
gcloud run services delete wylto-shopify-production --region asia-south1 --project wylto-c2964
```

---

## Section 6: Related Infrastructure

| Resource | Details |
|---|---|
| Wylto Backend | wylto-ai-server (same project, asia-south1) — **DO NOT TOUCH** |
| Backend URL | https://server.wylto.com |
| Backend Last Deployed | May 3, 2026 (revision 00031) |
| Firestore | Default database, asia-south1 |
| Cloud SQL | None |
| Redis | None |
| Repository | GitHub under sales@wylto.com account |

The app is fully stateless — no Cloud SQL, no Redis.

---

## Section 7: Shopify App Details

| Field | Value |
|---|---|
| App Name | Wylto |
| Partner Account | sales@wylto.com |
| App Status | In review (paused — pending resubmission) |
| Test Store | wyl-store-bnglr.myshopify.com |
| App Config | shopify.app.toml (project root) |

---

## Section 8: Architecture Summary

```
Shopify Store
    → Webhooks
        → Cloud Run (wylto-production)
            → Wylto Backend (server.wylto.com)
                → WhatsApp Business API
```

- **Stateless app** — no local database
- **OAuth sessions** use `MemorySessionStorage` (ephemeral; sessions lost on container restart)
- **Merchant data** stored in Wylto backend (Firestore)
- **GDPR webhooks** registered and handled

---

## Section 9: Deployment History

| Date | Revision | What Changed |
|---|---|---|
| Jan 20, 2026 | 00001-5sh | Initial deployment |
| Jan 21, 2026 | 00007-dl7 | GDPR webhooks, 401 HMAC fix, env var updates |
| May 12, 2026 | 00008-dqj | UI text fixes, chart.js removal, analytics link updates |
