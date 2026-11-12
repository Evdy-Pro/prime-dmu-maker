# Build the Vite SPA, then serve dist/ with nginx.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at build time. Coolify build env supplies these.
ARG VITE_API_BASE_URL=
ARG VITE_API_CLIENT_ID=
ARG VITE_API_CLIENT_SECRET=
ARG VITE_USE_MOCK_DATA=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_CLIENT_ID=$VITE_API_CLIENT_ID \
    VITE_API_CLIENT_SECRET=$VITE_API_CLIENT_SECRET \
    VITE_USE_MOCK_DATA=$VITE_USE_MOCK_DATA

RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1/health || exit 1
