# Multi-stage build for production
FROM oven/bun:1 AS builder
WORKDIR /usr/src/app

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

# Install all dependencies (needed for build output)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy built application and necessary files
COPY --from=builder /usr/src/app/build ./build
COPY --from=builder /usr/src/app/static ./static
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules/.vite ./node_modules/.vite || true

# Expose port
EXPOSE 5173/tcp

# Run the production server
USER bun
CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "5173"]
