FROM node:24.18.0-bookworm-slim AS dependency-base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

FROM dependency-base AS build
RUN npm ci --no-audit --no-fund
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/src ./apps/api/src
RUN npm run build

FROM build AS migrations
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY apps/api/migrations ./apps/api/migrations
WORKDIR /app/apps/api
USER node
CMD ["node", "../../node_modules/prisma/dist/prisma.js", "db", "migrate"]

FROM dependency-base AS production-dependencies
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24.18.0-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/api/v1/ready',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
