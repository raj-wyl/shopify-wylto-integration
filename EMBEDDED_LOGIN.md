# Embedded Wylto login (API-token retrieval)

Goal: let a merchant log in to Wylto and copy their API token **inside the
Shopify admin**, instead of opening an external tab — so the app keeps a
consistent embedded experience (Shopify App Store rule 2.2.2).

## How it works

The connect screen (`app/routes/app._index.jsx`) renders a `TokenFrame`
component — an `<iframe>` pointing at a Wylto URL that shows the login and,
after login, only the API-token view.

The URL is read from an environment variable in the loader:

```
WYLTO_EMBED_TOKEN_URL
```

- **Set** → the connect screen embeds the Wylto login/token view in the iframe.
- **Unset (default)** → falls back to the existing "Get your API token →" link
  that opens `app.wylto.com/login` in a new tab.

So the infrastructure ships safely with the variable empty; setting it activates
the embedded experience with no further code change.

## What the Wylto side must provide

The framed URL (to be supplied by the backend team) must:

1. **Allow being framed by this app.** Send a `Content-Security-Policy` with
   `frame-ancestors` that includes the app's Cloud Run origin
   (`https://wylto-production-...run.app`), and do **not** send
   `X-Frame-Options: DENY`. Otherwise the browser blocks the iframe.
2. **Work without third-party cookies** (incognito Chrome). The Shopify admin
   is a cross-site context; a login that depends on third-party cookies will
   fail there (rule 1.1.1).
3. **Show only what's needed** — login, then the API-token value — so nothing
   sensitive beyond the token is exposed inside the frame.

## Wiring it up once the URL exists

1. Set `WYLTO_EMBED_TOKEN_URL` on the Cloud Run service.
2. Redeploy. No code change required.
3. Verify on a test store that the iframe loads (and loads in incognito).

If the iframe is blocked, it's almost always a framing-header / cookie issue on
the Wylto side — check the two requirements above.
