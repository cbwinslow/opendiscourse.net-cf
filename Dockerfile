# OpenDiscourse API Service Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run the application
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-privileged user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 opendiscourse

# Copy the built application
COPY --from=builder --chown=opendiscourse:nodejs /app/dist ./dist
COPY --from=builder --chown=opendiscourse:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=opendiscourse:nodejs /app/package.json ./package.json

# Copy services and other necessary files
COPY --from=builder --chown=opendiscourse:nodejs /app/services ./services
COPY --from=builder --chown=opendiscourse:nodejs /app/migrations ./migrations

USER opendiscourse

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/worker.js"]