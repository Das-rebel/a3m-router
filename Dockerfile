# =============================================================================
# A3M Router — Adaptive Memory Multi-Model Router
# Multi-stage Docker build for minimal production image
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:20-slim AS build

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json tsconfig.build.json ./
COPY src/ src/

# Build TypeScript → dist/
RUN npm run build

# Prune dev dependencies (optional, to keep only production deps if any)
# RUN npm prune --production

# ---------------------------------------------------------------------------
# Stage 2: Run
# ---------------------------------------------------------------------------
FROM node:20-alpine AS run

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy built artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Default port for the A3M Router API/health endpoint
EXPOSE 3000

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Default command — start the main router server
CMD ["node", "dist/index.js"]
