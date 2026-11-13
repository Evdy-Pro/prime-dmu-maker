# Deployment

Describes `package.json` scripts, `vite.config.ts`, `.github/workflows/pages.yml`, `Dockerfile`, and `nginx.conf`.

## Local

```bash
npm ci
npm run dev       # Vite dev server
npm run build     # vue-tsc -b && vite build → dist/
npm run preview   # serve dist/
npm run lint      # oxlint
```

Node 22 is what GitHub Actions uses (`actions/setup-node`).

## Asset base

`vite.config.ts` sets `base` to `./` for `vite build` and `/` for the dev server. The relative base lets one `dist/` work on GitHub project pages without hard-coding the repo name. The export does not fetch logos. The PRIME and webinar logos are hosted at `media.primeinc.org`, so the base path does not affect them. See `docs/dmu-output.md`.

## Synapse env

`npm run dev` reads these names from `.env.local`. `.env.example` lists the same names with empty values. Do not commit values.

| Name | Role |
| --- | --- |
| `VITE_API_BASE_URL` | Synapse origin. Empty keeps the mock catalog |
| `VITE_API_CLIENT_ID` | Sent as `X-Client-Id` |
| `VITE_API_CLIENT_SECRET` | Sent as `X-Client-Secret` |
| `VITE_USE_MOCK_DATA` | `true` forces the mock catalog even when the base URL is set |

When the base URL is set, the dev server proxies paths starting with `/client` to that origin (`changeOrigin: true`). The browser calls that same-origin path in dev and in the Coolify image. `VITE_API_BASE_URL` still chooses live data over the mock catalog. The client id and secret are inlined at build time and are present in the built JavaScript. Coolify supplies them as image build args.

The GitHub Pages workflow does not set these variables, so that build uses the mock catalog.

## GitHub Pages

`.github/workflows/pages.yml` builds on push to `main` (and `workflow_dispatch`) and deploys `dist/` with `actions/deploy-pages`. This is the current static host for the mock app.

## Coolify

The Synapse-backed app is meant for Coolify (PRIME team on `app.ehg-pro.com`), so browsers can reach internal Synapse endpoints. GitHub Pages keeps serving the mock build.

Coolify project **PRIME DMU Maker**, application **DMU Maker**, public repo `Evdy-Pro/prime-dmu-maker` branch `main`, domain `https://dmu-maker.primeinc.dev` (FQDN stored as `http://…` like other PRIME apps behind the TLS load balancer). Default deploy uses the mock catalog until Synapse build env is set.

### Image

`Dockerfile` is a multi-stage build: `node:22-alpine` runs `npm ci` and `npm run build`, then `nginx:1.27-alpine` serves `dist/` on port **80**. `nginx.conf` maps `/` to the SPA, `/health` for Coolify’s health check (`curl` is installed in the runtime image), and proxies `/client/` to `https://synapse-api.primeinc.org`. Coolify build pack: `dockerfile`. `.dockerignore` keeps `node_modules`, `dist`, `.git`, and env files out of the build context. Keep `DMU Examples/` in the context — `src/templates/primeDmuCss.ts` imports the reference CSS from there at build time.

### Env vars (build time)

Vite inlines `VITE_*` at build time. Set these as Coolify build arguments / build-time env (names only; values stay in Coolify, never in git). Each one must be available during build. A value that contains `$` must be literal so Coolify does not interpolate it. Under Advanced → Build, set Build arguments to Managed manually in Dockerfile. Leave Docker BuildKit secrets off: that mode does not pass `--build-arg`, and the Dockerfile reads these through `ARG` and `ENV`. The `ARG` lines have no default, so an empty default cannot replace an inherited value. The nginx stage does not receive these variables. After a credential change, redeploy without cache so the `npm run build` layer is not reused.

| Name | Role |
| --- | --- |
| `VITE_API_BASE_URL` | Synapse origin. Empty keeps the mock catalog |
| `VITE_API_CLIENT_ID` | Sent as `X-Client-Id` |
| `VITE_API_CLIENT_SECRET` | Sent as `X-Client-Secret` |
| `VITE_USE_MOCK_DATA` | `true` forces the mock catalog even when the base URL is set |

The browser calls same-origin paths starting with `/client`. Nginx proxies those paths to `https://synapse-api.primeinc.org`, keeps the path, sets `Host` to that origin, and forwards `X-Client-Id` and `X-Client-Secret`. It forwards the incoming `X-Forwarded-Proto`, and uses the container scheme only when that header is absent. Uploads are allowed up to 12MB. `VITE_API_BASE_URL` still only chooses live data over the mock catalog. Leave the vars empty for a mock-only Coolify deploy. A live build (base URL set, and `VITE_USE_MOCK_DATA` not `true`) fails if the client id or secret is blank or missing from `dist/assets/*.js`. The failure text does not include the values.
