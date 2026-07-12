#!/bin/sh
# Helper for Windows/Docker Desktop hosts where the Prisma engine's
# authentication handshake fails when connecting through the published
# Postgres port (a Docker Desktop / WSL2 TCP proxy quirk — psql and the
# actual app container are unaffected, only the Prisma CLI running
# directly on the Windows host is). Runs any `prisma` subcommand inside a
# throwaway Linux container attached to the compose network instead.
#
# Usage: ./scripts/prisma-docker.sh migrate dev --name add_something
set -eu
cd "$(dirname "$0")/.."

docker compose up -d db >/dev/null
docker run --rm \
  --network "$(basename "$(pwd)")_acy_net" \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-acy_admin}:${POSTGRES_PASSWORD:-ChangeMeStrongPassword123}@db:5432/${POSTGRES_DB:-acy_quotation}?schema=public" \
  -v "$(pwd)/prisma:/app/prisma" \
  -v "$(pwd)/package.json:/app/package.json" \
  -w /app \
  node:20-bookworm-slim \
  sh -c "apt-get update -qq && apt-get install -y -qq openssl >/dev/null 2>&1 && npm install --no-audit --no-fund prisma@5.19.1 @prisma/client@5.19.1 --no-save >/dev/null 2>&1 && npx prisma $*"
