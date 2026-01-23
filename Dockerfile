# Multi-stage build for production
FROM oven/bun:1 AS builder
WORKDIR /usr/src/app

# Provide DATABASE_URL at build time for SvelteKit SSR bundle compilation.
# Some server modules import the DB client at module load and require DATABASE_URL.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and build
COPY . .
RUN bun run paraglide-js
RUN bun run build

# Production image
FROM oven/bun:1 AS production
WORKDIR /usr/src/app

# Keep the same env var available in the runtime image (compose will override it).
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Install all dependencies (needed for build output)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy built application and necessary files
COPY --from=builder /usr/src/app/build ./build
COPY --from=builder /usr/src/app/static ./static
COPY --from=builder /usr/src/app/package.json ./
# Include Drizzle config + schema so db:push works
COPY --from=builder /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /usr/src/app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts
COPY --from=builder /usr/src/app/src/lib/server/db/seed.ts ./src/lib/server/db/seed.ts
COPY --from=builder /usr/src/app/src/lib/password.ts ./src/lib/password.ts
# Note: .vite directory is not needed for adapter-node production builds

# Expose port
EXPOSE 5173/tcp

# Run the production server
# adapter-node generates a Node.js server, not static files
# So we run the built server directly instead of vite preview
# PORT environment variable is set by docker-compose.prod.yml
USER bun
CMD ["bun", "run", "build/index.js"]
