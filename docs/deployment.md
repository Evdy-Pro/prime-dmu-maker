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

The Synapse-backed app runs on Coolify from the repo `Dockerfile`. Coolify should use that Dockerfile and proxy port 80.

The image builds with Node 22 (`npm ci`, then `npm run build`) and serves `dist/` with Nginx. Set these as image build args (names only, never values):

- `VITE_API_BASE_URL` — the Synapse origin, such as `https://synapse-api.primeinc.org`. A non-empty value selects live data. The browser does not call this origin.
- `VITE_API_CLIENT_ID`
- `VITE_API_CLIENT_SECRET`
- `VITE_USE_MOCK_DATA` — leave unset so live data stays on. `true` forces the mock catalog.

The browser calls same-origin paths starting with `/client`. Nginx proxies those paths to `https://synapse-api.primeinc.org`, keeps the path, sets `Host` to that origin, and forwards `X-Client-Id` and `X-Client-Secret`. Uploads are allowed up to 12MB. Every other path is the static app, and unknown paths fall back to `index.html`.

GitHub Pages can keep serving the mock build. The Synapse-backed app belongs on Coolify, because those endpoints are internal.
