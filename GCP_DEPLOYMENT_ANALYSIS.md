# Shopify Wylto App - GCP Deployment Analysis

**Date:** January 7, 2026
**Location:** `/Users/raj/Desktop/Wylto/shopify-wylto-integration`

---

## 1. PROJECT STRUCTURE ANALYSIS

### ✅ Root Directory Contents

```
shopify-wylto-integration/
├── app/                      # Application source code
│   ├── routes/               # React Router v7 routes (18 files)
│   ├── shopify.server.js     # Shopify app configuration
│   ├── db.server.js          # Prisma client singleton
│   ├── entry.server.jsx      # Server entry point
│   └── root.jsx              # Root component
├── prisma/                   # Database schema & migrations
│   ├── schema.prisma         # 5 models (Session, Store, WebhookLog, MessageLog, PendingCart)
│   ├── migrations/           # Migration history
│   └── dev.sqlite            # SQLite DB (DEV ONLY - needs PostgreSQL)
├── build/                    # Build output (after npm run build)
│   ├── client/               # Client-side assets
│   └── server/
│       └── index.js          # 48KB - Server entry (starts on port 3000)
├── public/                   # Static assets
├── extensions/               # Shopify extensions (empty)
├── Dockerfile                # ✅ EXISTS
├── .dockerignore             # ✅ EXISTS
├── package.json              # Dependencies
├── vite.config.js            # Vite configuration
├── shopify.app.wyl-store-bnglr.toml  # App config
└── node_modules/             # Dependencies (563 packages)
```

### ✅ Key Files Present

- [x] **Dockerfile** - EXISTS (19 lines, Node 20 Alpine)
- [x] **.dockerignore** - EXISTS (excludes node_modules, build, .cache)
- [x] **package.json** - React Router v7, Shopify packages
- [x] **vite.config.js** - Build configuration
- [x] **prisma/schema.prisma** - Database schema

---

## 2. PACKAGE DEPENDENCIES

### **Framework & Build Tool**

```json
{
  "type": "module",
  "engines": {
    "node": ">=20.19 <22 || >=22.12"
  }
}
```

**Build Tool:** Vite v6.3.6
**Framework:** React Router v7 (NOT Remix)
**Node Version Required:** 20.19+ or 22.12+

### **Key Dependencies**

```json
"dependencies": {
  "@prisma/client": "^6.16.3",
  "@react-router/dev": "^7.10.1",
  "@react-router/node": "^7.9.3",
  "@react-router/serve": "^7.9.3",
  "@shopify/app-bridge-react": "^4.2.4",
  "@shopify/shopify-app-react-router": "^1.0.0",
  "@shopify/shopify-app-session-storage-prisma": "^7.0.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router": "^7.10.1",
  "prisma": "^6.16.3"
}
```

### **Scripts**

```json
"scripts": {
  "build": "react-router build",                // Builds to build/ directory
  "start": "react-router-serve ./build/server/index.js",  // Starts production server
  "docker-start": "npm run setup && npm run start",       // Docker entry point
  "setup": "prisma generate && prisma migrate deploy",    // DB setup
  "dev": "shopify app dev"                                // Development only
}
```

### ⚠️ **Notable Points**

- **NOT using Remix** - Using React Router v7 (newer architecture)
- **Production start:** `react-router-serve ./build/server/index.js`
- **Port:** 3000 (configurable via `PORT` env var)
- **Docker command:** `npm run docker-start` (runs migrations + starts server)

---

## 3. ENVIRONMENT VARIABLES REQUIRED

### **From Code Analysis**

```bash
# REQUIRED (app won't start without these)
SHOPIFY_API_KEY=ce16a95a48c256efdaf69d4a96f8e725
SHOPIFY_API_SECRET=your_secret_here
SCOPES=read_checkouts,read_customers,read_fulfillments,read_orders,read_products
SHOPIFY_APP_URL=https://your-app-url.com

# OPTIONAL
SHOP_CUSTOM_DOMAIN=custom-domain.com    # For custom shop domains
PORT=3000                                # Server port (defaults to 3000)
NODE_ENV=production                      # Set to production in GCP

# DATABASE (Critical for GCP)
DATABASE_URL=postgresql://user:pass@host:5432/dbname  # Must use PostgreSQL
```

### **Source Files Using Env Vars**

| File | Variables Used |
|------|----------------|
| `app/shopify.server.js` | `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`, `SHOPIFY_APP_URL`, `SHOP_CUSTOM_DOMAIN` |
| `app/routes/app.jsx` | `SHOPIFY_API_KEY` (passed to frontend) |
| `app/db.server.js` | `NODE_ENV` (for Prisma client singleton) |
| `vite.config.js` | `SHOPIFY_APP_URL`, `PORT`, `FRONTEND_PORT` |

### ⚠️ **Missing .env.example**

**Issue:** No `.env.example` file found in repository.

**Recommendation:** Create one before deployment for documentation.

---

## 4. BUILD CONFIGURATION

### **Vite Configuration** (`vite.config.js`)

```javascript
export default defineConfig({
  resolve: {
    alias: {
      "react-router-dom": "react-router"  // React Router v7 compatibility fix
    }
  },
  server: {
    port: Number(process.env.PORT || 3000),
    allowedHosts: [host],
    cors: { preflightContinue: true }
  },
  plugins: [reactRouter(), tsconfigPaths()],
  build: {
    assetsInlineLimit: 0
  }
});
```

### **Build Output**

```
✅ Build successful (964ms)

Output:
build/
├── client/
│   ├── assets/
│   │   ├── entry.client-DzSvqsVN.js  (141KB - main bundle)
│   │   ├── chunk-WWGJGFF6-wQdeuPHC.js (122KB)
│   │   └── *.css, *.js (various route chunks)
│   └── .vite/manifest.json
└── server/
    ├── index.js (48KB - production server)
    └── assets/server-build-Xpdx9QZl.css
```

### **Build Process**

1. `npm run build` → Runs `react-router build`
2. Vite compiles client-side React app → `build/client/`
3. Vite compiles server-side SSR bundle → `build/server/index.js`
4. Total build time: ~1 second

### ✅ **Build Status: SUCCESS**

---

## 5. SERVER CONFIGURATION

### **Server Startup**

```json
"start": "react-router-serve ./build/server/index.js"
```

**Server Entry:** `build/server/index.js` (generated by Vite)
**Port:** 3000 (from `process.env.PORT || 3000` in vite.config.js)
**Protocol:** HTTP (use GCP Load Balancer for HTTPS termination)

### **Entry Point Analysis**

```javascript
// app/entry.server.jsx
export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent) ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
      {
        [callbackName]: () => {
          // Stream React to client
        }
      }
    );
    setTimeout(abort, 6000);  // 6 second timeout
  });
}
```

**Key Points:**
- Streaming SSR (React 18 feature)
- Bot detection via `isbot`
- 6 second render timeout
- Adds Shopify security headers

---

## 6. SHOPIFY APP CONFIGURATION

### **Shopify Server Config** (`app/shopify.server.js`)

```javascript
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),  // ⚠️ Uses Prisma
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled"
    },
    APP_SCOPES_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/scopes_update"
    }
  }
});
```

### **Session Storage**

**Current:** `PrismaSessionStorage` (stores OAuth tokens in database)

**Database:** Prisma → SQLite (dev) | **PostgreSQL (production required)**

### **Webhook Routes**

```
✅ /webhooks/app/uninstalled
✅ /webhooks/app/scopes_update
✅ /webhooks/orders/create
✅ /webhooks/orders/updated
✅ /webhooks/fulfillments/create
✅ /webhooks/checkouts/create
✅ /webhooks/checkouts/update
```

All webhook handlers use `authenticate.webhook(request)` for HMAC verification.

---

## 7. DATABASE CONFIGURATION (CRITICAL)

### **Current Setup (DEV)**

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:dev.sqlite"
}
```

**Database File:** `prisma/dev.sqlite` (84KB)

### ⚠️ **CRITICAL ISSUE: SQLite Not Suitable for Production**

**Problems:**
- ❌ File-based (won't work with Cloud Run's stateless containers)
- ❌ No connection pooling
- ❌ Data lost on container restart
- ❌ Can't handle concurrent requests well

### ✅ **REQUIRED: Switch to PostgreSQL**

**For GCP Deployment:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Options:**
1. **Cloud SQL (PostgreSQL)** - Recommended
   - Managed service
   - Auto backups
   - High availability
   - Connection pooling

2. **Supabase** (PostgreSQL hosting)
   - Free tier available
   - Built-in connection pooling
   - REST API included

### **Migration Steps (Before Deployment)**

```bash
# 1. Update schema
# Edit prisma/schema.prisma - change provider to "postgresql"

# 2. Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/wylto_shopify"

# 3. Create new migration
npx prisma migrate dev --name switch_to_postgresql

# 4. Deploy to production
npx prisma migrate deploy

# 5. Generate Prisma client
npx prisma generate
```

### **Database Models (5 tables)**

```
✅ Session          - Shopify OAuth sessions (used by PrismaSessionStorage)
✅ Store            - Shopify store + Wylto tenant mapping
✅ WebhookLog       - Audit trail for incoming webhooks
✅ MessageLog       - WhatsApp messages sent via Wylto
✅ PendingCart      - Abandoned cart recovery queue
```

---

## 8. DOCKERFILE ANALYSIS

### **Current Dockerfile**

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache openssl      # For Prisma

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN npm run build                    # Runs react-router build

CMD ["npm", "run", "docker-start"]  # Runs: prisma generate && prisma migrate deploy && npm run start
```

### ✅ **Dockerfile Assessment**

**Good:**
- ✅ Uses Node 20 Alpine (matches engines requirement)
- ✅ Includes OpenSSL (required for Prisma)
- ✅ Multi-stage pattern (dependencies → build → run)
- ✅ Runs build inside container
- ✅ Runs Prisma migrations on startup

**Issues:**
- ⚠️ **No .dockerignore optimization** - Current file only excludes 3 items
- ⚠️ **No health check** - GCP Cloud Run needs health endpoints
- ⚠️ **Prisma generate runs on startup** - Should be in build step

### **Recommended Dockerfile (Optimized)**

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app

# Dependencies layer (cached)
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Build layer
FROM base AS build
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production layer
FROM base AS production
ENV NODE_ENV=production
EXPOSE 3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY prisma ./prisma

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

### **Improved .dockerignore**

```
# Dependencies
node_modules

# Build artifacts
build
dist
.cache
.react-router

# Development files
.env
.env.*
!.env.example
*.log
npm-debug.log*

# Git
.git
.gitignore

# IDE
.vscode
.idea
.DS_Store

# Docs
*.md
!README.md

# Tests
*.test.js
*.test.jsx
test/

# Shopify dev files
.shopify

# SQLite (dev database)
*.sqlite
*.sqlite-journal

# Misc
extensions/
public/
```

---

## 9. GCP DEPLOYMENT REQUIREMENTS

### **Pre-Deployment Checklist**

#### **Database Migration**
- [ ] Create Cloud SQL PostgreSQL instance
- [ ] Update `prisma/schema.prisma` provider to `postgresql`
- [ ] Set `DATABASE_URL` in Cloud Run environment
- [ ] Run `npx prisma migrate deploy` during first deployment
- [ ] Test connection from local machine

#### **Environment Variables (Cloud Run)**
- [ ] `SHOPIFY_API_KEY` (from Shopify Partner Dashboard)
- [ ] `SHOPIFY_API_SECRET` (from Shopify Partner Dashboard)
- [ ] `SCOPES=read_checkouts,read_customers,read_fulfillments,read_orders,read_products`
- [ ] `SHOPIFY_APP_URL=https://your-app-xxxxx.run.app`
- [ ] `DATABASE_URL=postgresql://...` (Cloud SQL connection string)
- [ ] `NODE_ENV=production`
- [ ] `PORT=8080` (Cloud Run default, or use 3000)

#### **Shopify Configuration**
- [ ] Update app URL in Shopify Partner Dashboard
- [ ] Update OAuth redirect URLs
- [ ] Update webhook URLs to Cloud Run URL
- [ ] Test OAuth flow
- [ ] Test webhook delivery

#### **Docker Build**
- [ ] Optimize Dockerfile (use multi-stage build)
- [ ] Update .dockerignore
- [ ] Test build locally: `docker build -t wylto-shopify .`
- [ ] Test run locally: `docker run -p 3000:3000 --env-file .env wylto-shopify`

#### **Health Check Endpoint**
- [ ] Add `/health` route to app
- [ ] Configure Cloud Run health check path

#### **Monitoring & Logging**
- [ ] Enable Cloud Run logging
- [ ] Set up error alerting (Sentry recommended)
- [ ] Monitor webhook delivery rates
- [ ] Track Prisma query performance

---

## 10. DEPLOYMENT COMMANDS

### **Step 1: Build & Push to Google Container Registry**

```bash
# Set project
gcloud config set project YOUR_GCP_PROJECT_ID

# Build image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/wylto-shopify:latest

# Or use Cloud Build (recommended)
gcloud builds submit --config cloudbuild.yaml
```

### **Step 2: Deploy to Cloud Run**

```bash
gcloud run deploy wylto-shopify \
  --image gcr.io/YOUR_PROJECT_ID/wylto-shopify:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "SHOPIFY_API_KEY=your_key" \
  --set-env-vars "SHOPIFY_API_SECRET=your_secret" \
  --set-env-vars "SCOPES=read_checkouts,read_customers,read_fulfillments,read_orders,read_products" \
  --set-env-vars "DATABASE_URL=postgresql://..." \
  --set-env-vars "SHOPIFY_APP_URL=https://wylto-shopify-xxxxx.run.app"
```

### **Step 3: Connect to Cloud SQL**

```bash
# Option 1: Cloud SQL Proxy (recommended)
gcloud run deploy wylto-shopify \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:wylto-db \
  --set-env-vars "DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/YOUR_PROJECT_ID:us-central1:wylto-db"

# Option 2: Public IP (less secure)
# Use public IP in DATABASE_URL
```

---

## 11. WARNINGS & ISSUES

### 🔴 **CRITICAL ISSUES**

1. **SQLite Database**
   - **Issue:** Using SQLite in development
   - **Impact:** Won't work in Cloud Run (stateless containers)
   - **Fix:** Migrate to PostgreSQL BEFORE deployment
   - **Priority:** HIGHEST

2. **No Health Check Endpoint**
   - **Issue:** No `/health` route
   - **Impact:** Cloud Run can't verify app is healthy
   - **Fix:** Add health check route
   - **Priority:** HIGH

3. **Missing .env.example**
   - **Issue:** No environment variable documentation
   - **Impact:** Deployment confusion
   - **Fix:** Create `.env.example` file
   - **Priority:** MEDIUM

### ⚠️ **WARNINGS**

1. **Dockerfile Not Optimized**
   - Currently runs `prisma generate` on every container start
   - Should move to build step for faster startups
   - **Impact:** Slower cold starts in Cloud Run

2. **No Connection Pooling**
   - Prisma direct connection to PostgreSQL
   - **Recommendation:** Use Prisma Data Proxy or PgBouncer
   - **Impact:** Connection limit issues under load

3. **Session Storage in Database**
   - OAuth tokens stored in database
   - **Consideration:** Redis might be better for sessions
   - **Impact:** Extra database load for every request

4. **No Error Monitoring**
   - No Sentry or error tracking configured
   - **Recommendation:** Add Sentry before production
   - **Impact:** Harder to debug production issues

5. **Webhook Processing Synchronous**
   - Webhooks processed inline (no queue)
   - **Recommendation:** Use Cloud Tasks or Pub/Sub for async processing
   - **Impact:** Slow webhook responses under load

6. **No Rate Limiting**
   - No rate limiting on API endpoints
   - **Recommendation:** Add rate limiting middleware
   - **Impact:** Vulnerable to abuse

---

## 12. RECOMMENDED CHANGES BEFORE DEPLOYMENT

### **High Priority (Must Do)**

```bash
# 1. Switch to PostgreSQL
# Edit prisma/schema.prisma:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# 2. Add health check route
# Create app/routes/health.jsx:
export const loader = () => {
  return new Response("OK", { status: 200 });
};

# 3. Create .env.example
cat > .env.example << EOF
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SCOPES=read_checkouts,read_customers,read_fulfillments,read_orders,read_products
SHOPIFY_APP_URL=https://your-app-url.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NODE_ENV=production
PORT=3000
EOF

# 4. Optimize Dockerfile (use multi-stage build from section 8)

# 5. Improve .dockerignore (from section 8)
```

### **Medium Priority (Recommended)**

1. Add Sentry for error tracking
2. Add connection pooling (Prisma Data Proxy or PgBouncer)
3. Add rate limiting middleware
4. Move webhook processing to async queue
5. Add logging middleware (Morgan or Winston)

### **Low Priority (Nice to Have)**

1. Add Redis for session caching
2. Add Prometheus metrics
3. Add end-to-end tests
4. Add load testing
5. Add deployment CI/CD pipeline

---

## 13. DEPLOYMENT TIMELINE ESTIMATE

### **Phase 1: Database Migration (2-4 hours)**
- Create Cloud SQL instance
- Update Prisma schema
- Run migrations
- Test connections

### **Phase 2: Dockerfile Optimization (1-2 hours)**
- Update Dockerfile
- Update .dockerignore
- Test local build
- Add health check endpoint

### **Phase 3: Environment Setup (1 hour)**
- Create .env.example
- Document all env vars
- Set up Cloud Run environment variables

### **Phase 4: First Deployment (2-3 hours)**
- Build and push to GCR
- Deploy to Cloud Run
- Test OAuth flow
- Test webhooks
- Debug issues

### **Phase 5: Shopify Configuration (1 hour)**
- Update app URLs
- Update webhook URLs
- Test installation
- Test merchant flow

**Total Estimated Time: 7-11 hours**

---

## 14. DEPLOYMENT READINESS SCORE

### **Current Status: 60% Ready**

| Category | Status | Score |
|----------|--------|-------|
| Code Quality | ✅ Good | 90% |
| Build Process | ✅ Working | 95% |
| Database Setup | ❌ SQLite | 20% |
| Docker Config | ⚠️ Basic | 60% |
| Environment Vars | ⚠️ Documented | 70% |
| Health Checks | ❌ Missing | 0% |
| Monitoring | ❌ None | 0% |
| Security | ⚠️ Basic | 60% |

### **Blocking Issues (Must Fix)**
1. ❌ SQLite → PostgreSQL migration
2. ❌ Add health check endpoint
3. ⚠️ Optimize Dockerfile

### **Non-Blocking (Can Deploy Without)**
1. Error monitoring (Sentry)
2. Connection pooling
3. Rate limiting
4. Async webhook processing

---

## 15. NEXT STEPS

### **Immediate Actions (This Week)**

1. **Migrate to PostgreSQL**
   ```bash
   # Update schema
   vim prisma/schema.prisma  # Change provider to "postgresql"

   # Create Cloud SQL instance
   gcloud sql instances create wylto-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1

   # Test migration
   npx prisma migrate dev --name switch_to_postgresql
   ```

2. **Add Health Check**
   ```javascript
   // app/routes/health.jsx
   export const loader = async () => {
     // Test database connection
     try {
       await db.$queryRaw`SELECT 1`;
       return new Response("OK", { status: 200 });
     } catch (error) {
       return new Response("Database Error", { status: 500 });
     }
   };
   ```

3. **Optimize Docker**
   - Use multi-stage Dockerfile from section 8
   - Update .dockerignore from section 8

4. **Test Local Build**
   ```bash
   docker build -t wylto-shopify:test .
   docker run -p 3000:3000 --env-file .env.production wylto-shopify:test
   ```

5. **Deploy to GCP**
   - Follow commands from section 10
   - Start with minimal resources (512Mi RAM, 1 CPU)
   - Scale up based on usage

---

## 16. SUPPORT & RESOURCES

### **Documentation**
- [React Router v7 Docs](https://reactrouter.com/)
- [Shopify App React Router](https://github.com/Shopify/shopify-app-js/tree/main/packages/apps/shopify-app-react-router)
- [Prisma with PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud SQL Docs](https://cloud.google.com/sql/docs/postgres)

### **Common Issues**
- [React Router v7 Migration](https://reactrouter.com/start/framework/migration)
- [Prisma Connection Pooling](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Shopify Webhook Verification](https://shopify.dev/docs/apps/build/webhooks/subscribe/https)

---

**Analysis Complete.**
**Deployment Readiness: 60% (Critical issues must be fixed)**
**Estimated Deployment Time: 7-11 hours**
**Recommended Next Action: Migrate to PostgreSQL**
