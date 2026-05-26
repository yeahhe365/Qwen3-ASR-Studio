FROM node:22-alpine AS builder

WORKDIR /app

COPY asr-studio/package*.json ./
RUN npm ci

COPY asr-studio/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY asr-studio/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
