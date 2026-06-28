## ─── Backend Dockerfile ──────────────────────────────────────────────────────
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 5000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 express
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
RUN mkdir -p /var/data && chown express:nodejs /var/data
USER express
EXPOSE 5000
CMD ["node", "dist/server.js"]
