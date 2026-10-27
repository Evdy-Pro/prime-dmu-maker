# Deployment

Describes `package.json` scripts, `vite.config.ts`, and `.github/workflows/pages.yml`.

## Local

```bash
npm ci
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build → dist/
npm run preview   # serve dist/
npm run lint      # oxlint
```

Node 22 is what GitHub Actions uses (`actions/setup-node`).

## Asset base

`vite.config.ts` sets `base` to `./` for `vite build` and `/` for the dev server. The relative base lets one `dist/` work on GitHub project pages without hard-coding the repo name. Export logo fetches use `import.meta.env.BASE_URL`, so a base-path change has to keep those fetches working. See `docs/dmu-output.md`.

## Synapse env

`npm run dev` reads these names from `.env.local`. `.env.example` lists the same names with empty values. Do not commit values.

| Name | Role |
| --- | --- |
| `VITE_API_BASE_URL` | Synapse origin. Empty keeps the mock catalog |
| `VITE_API_CLIENT_ID` | Sent as `X-Client-Id` |
| `VITE_API_CLIENT_SECRET` | Sent as `X-Client-Secret` |
| `VITE_USE_MOCK_DATA` | `true` forces the mock catalog even when the base URL is set |

When the base URL is set, the dev server proxies paths starting with `/client` to that origin (`changeOrigin: true`). The browser calls that same-origin path. A production build calls the origin directly, because Vite inlines `VITE_` values at build time. Coolify must supply them to the build. Those values are present in the built JavaScript.

The GitHub Pages workflow does not set these variables, so that build uses the mock catalog.

## GitHub Pages

`.github/workflows/pages.yml` builds on push to `main` (and `workflow_dispatch`) and deploys `dist/` with `actions/deploy-pages`. This is the current static host for the mock app.

## Coolify

The Synapse-backed app is meant for Coolify (PRIME team on `app.ehg-pro.com`), so browsers can reach internal Synapse endpoints. GitHub Pages keeps serving the mock build.

### Image

`Dockerfile` is a multi-stage build: `node:22-alpine` runs `npm ci` and `npm run build`, then `nginx:1.27-alpine` serves `dist/` on port **80**. `nginx.conf` maps `/` to the SPA and `/health` for Coolify’s health check (`curl` is installed in the runtime image). Coolify build pack: `dockerfile`. `.dockerignore` keeps `node_modules`, `dist`, `.git`, and env files out of the build context.

### Env vars (build time)

Vite inlines `VITE_*` at build time. Set these as Coolify build arguments / build-time env (names only; values stay in Coolify, never in git):

| Name | Role |
| --- | --- |
| `VITE_API_BASE_URL` | Synapse origin. Empty keeps the mock catalog |
| `VITE_API_CLIENT_ID` | Sent as `X-Client-Id` |
| `VITE_API_CLIENT_SECRET` | Sent as `X-Client-Secret` |
| `VITE_USE_MOCK_DATA` | `true` forces the mock catalog even when the base URL is set |

The browser calls the Synapse origin from `VITE_API_BASE_URL` directly in production builds (no Vite proxy). Leave the vars empty for a mock-only Coolify deploy.
