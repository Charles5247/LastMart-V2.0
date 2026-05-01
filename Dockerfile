# ─── Frontend (Next.js) — Multi-stage build ───────────────────────────────────
# Produces a lean standalone image (~200 MB) suitable for:
#   Docker Compose, Render, Railway, Fly.io, AWS ECS/App Runner, VPS

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# Copy only manifests first for layer-caching
COPY package.json package-lock.json .npmrc ./
RUN npm install --legacy-peer-deps

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.js sets output:'standalone' — this bakes in the standalone server
ARG BACKEND_API_URL=http://backend:5000
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Minimal runtime image ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone output (server.js + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets (CSS, JS chunks)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static
# Copy public folder (images, favicon, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs
EXPOSE 3000

# standalone/server.js is the self-contained Next.js server
CMD ["node", "server.js"]
