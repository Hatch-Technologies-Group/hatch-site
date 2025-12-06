FROM node:22-alpine

WORKDIR /app

# Copy lockfile and root package manifest for reproducible install
COPY pnpm-lock.yaml package.json ./

# System deps and pnpm
RUN apk add --no-cache bash openssl && npm install -g pnpm

# Install workspace deps
RUN pnpm install --frozen-lockfile

# Copy the rest of the monorepo
COPY . .

# Build API (and generate Prisma client) from monorepo root
RUN pnpm --filter @hatch/db run generate && pnpm --filter @hatch/api run build:dist

# Start the API
CMD ["pnpm", "--filter", "@hatch/api", "start"]
