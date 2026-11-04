FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@11.25.0 && NODE_OPTIONS=--max-old-space-size=128 pnpm install --prod --frozen-lockfile --child-concurrency=1 --network-concurrency=2 && mkdir -p /data && chown node:node /data /app
COPY --chown=node:node security.mjs proxy.mjs server.mjs downloads.mjs ./
USER node
ENV NODE_ENV=production PORT=3008 BROWSER_DATA_DIR=/data BROWSER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 3008
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3008/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
