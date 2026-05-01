# ─── Backend (Express + TypeScript) — Multi-stage build ──────────────────────
# Produces a lean production image (~150 MB) suitable for:
#   Docker Compose, Render, Railway, Fly.io, AWS ECS/App Runner, VPS

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Stage 2: Minimal runtime image ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 apiuser

# Persistent volume for SQLite database
RUN mkdir -p /data && chown apiuser:nodejs /data

# Copy compiled JS + production dependencies
COPY --from=builder --chown=apiuser:nodejs /app/dist         ./dist
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/package.json ./

# ── Uploaded files volume mount point ─────────────────────────────────────────
# Mount a volume at /uploads for persistent file storage.
# The backend serves these at /uploads/* via express.static.
RUN mkdir -p /uploads && chown apiuser:nodejs /uploads

USER apiuser
EXPOSE 5000

# DATABASE_PATH should point to the /data volume in production
ENV DATABASE_PATH=/data/lastmart.db

CMD ["node", "dist/server.js"]
