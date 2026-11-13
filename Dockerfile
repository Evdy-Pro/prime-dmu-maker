FROM node:22-alpine AS build
# Vite inlines VITE_* at build time. No default, so an inherited value is kept.
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_API_CLIENT_ID
ARG VITE_API_CLIENT_SECRET
ARG VITE_USE_MOCK_DATA
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_CLIENT_ID=$VITE_API_CLIENT_ID \
    VITE_API_CLIENT_SECRET=$VITE_API_CLIENT_SECRET \
    VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA

RUN npm run build && node scripts/check-inlined-synapse-env.cjs

FROM nginx:1.27-alpine
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1/health || exit 1
