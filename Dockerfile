# ACY Quotation System - Production Docker Image
# Single-stage-ish build on Debian slim (glibc) so Prisma engines and the
# system Chromium (used by Puppeteer for PDF export) both work reliably.
# We intentionally keep full node_modules in the runtime image (simpler,
# more reliable than a trimmed "standalone" bundle for an internal LAN tool).

FROM node:20-bookworm-slim AS base
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-thai-tlwg openssl ca-certificates dumb-init postgresql-client \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

FROM base AS deps
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd -r acy && useradd -r -g acy -m acy

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN mkdir -p /app/storage/uploads /app/storage/pdf /app/storage/backups \
    && chown -R acy:acy /app/storage /app/node_modules /app/.next

USER acy
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "node scripts/wait-for-db.js && npx prisma migrate deploy && node scripts/run-seed-if-empty.js && npm start"]
