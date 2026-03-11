FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_PUBLIC_API_BASE_URL=/api

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY apps/web ./apps/web

RUN npm run build --workspace web

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_BASE_URL=/api

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/web ./apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "web", "--", "-p", "3000", "-H", "0.0.0.0"]
