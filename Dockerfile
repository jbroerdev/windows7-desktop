FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN node scripts/fetch-wallpapers.mjs && pnpm build && pnpm test && pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    EXPLORER_ROOT=/Explorer \
    DATA_DIR=/Explorer/.explorer
RUN mkdir -p /Explorer/Users /Explorer/.explorer && chown -R node:node /Explorer
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/package.json /app/server.mjs /app/backend.mjs /app/computer-management.mjs /app/folder-properties.mjs /app/storage.mjs /app/media-transcode.mjs /app/host-monitor.mjs /app/storage-scan.mjs /app/disk-space.mjs /app/file-operations.mjs /app/office.mjs /app/php-worker.mjs ./
COPY --from=build --chown=node:node /app/scripts/setup-admin.mjs ./scripts/setup-admin.mjs
COPY --from=build --chown=node:node /app/scripts/docker-smoke.mjs ./scripts/docker-smoke.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/session').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
