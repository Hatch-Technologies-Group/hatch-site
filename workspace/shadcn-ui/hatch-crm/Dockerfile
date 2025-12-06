FROM node:22-alpine

# System deps and pnpm
RUN apk add --no-cache bash openssl && npm install -g pnpm

# Copy the monorepo
WORKDIR /app
COPY workspace/shadcn-ui/hatch-crm ./workspace/shadcn-ui/hatch-crm

# Install dependencies from the monorepo root
WORKDIR /app/workspace/shadcn-ui/hatch-crm
RUN pnpm install --frozen-lockfile

# Build API (and generate Prisma client)
RUN pnpm --filter @hatch/db run generate && pnpm --filter @hatch/api run build:dist

# Start the API
CMD ["pnpm", "--filter", "@hatch/api", "start"]
