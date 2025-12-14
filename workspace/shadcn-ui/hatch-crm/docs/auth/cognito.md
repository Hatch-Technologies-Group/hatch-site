# AWS Cognito (Hosted UI) Setup

## What app type?

Use **Traditional web application**.

- We use the **Authorization Code** flow.
- The Nest API exchanges the code server-side at `/oauth2/token` (so a client secret is supported/expected).
- The browser app does **not** talk to Cognito directly; it starts auth at `/api/v1/auth/cognito/login` and relies on API-set httpOnly cookies.

## Cognito console settings

In your User Pool → **App integration**:

- **Domain**: configure a Cognito Hosted UI domain.
- **App client**:
  - Enable **Authorization code grant**
  - Scopes: `openid` `email` (add `profile`/`phone` only if you actually need them)
  - Callback URL(s):
    - `https://findyourhatch.com/api/v1/auth/cognito/callback`
    - `http://localhost:5173/api/v1/auth/cognito/callback`
  - Logout URL(s) (recommended):
    - `https://findyourhatch.com`
    - `http://localhost:5173`

## API environment variables

Set these for `apps/api` (and your production deployment environment):

- `COGNITO_DOMAIN` = `https://<your-domain>.auth.<region>.amazoncognito.com`
- `COGNITO_CLIENT_ID` = `<app client id>`
- `COGNITO_CLIENT_SECRET` = `<app client secret>` (do not commit)
- `COGNITO_USER_POOL_ID` = `<region>_<poolId>`
- `COGNITO_CALLBACK_URL` = `https://findyourhatch.com/api/v1/auth/cognito/callback`
  - (Alternative) `COGNITO_REDIRECT_URI` = `https://findyourhatch.com` (the API will derive the callback URL)
  - Local dev (Vite): set `COGNITO_REDIRECT_URI` = `http://localhost:5173` so the callback becomes `http://localhost:5173/api/v1/auth/cognito/callback` (Vite proxies `/api/*` → `localhost:4000`)
- Optional:
  - `COGNITO_SCOPES` = `openid email`
  - `COGNITO_JWKS_CACHE_TTL_MS` = `3600000`

## Login URLs

- Web login page: `/login`
- Cognito redirect starter: `/api/v1/auth/cognito/login`
- Cognito callback: `/api/v1/auth/cognito/callback`
