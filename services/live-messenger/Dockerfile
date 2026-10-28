FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-workspace
COPY core.mjs discord.mjs server.mjs test.mjs ./
RUN node --test test.mjs

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/core.mjs /app/discord.mjs /app/server.mjs ./
RUN mkdir /messenger-data && chown node:node /messenger-data
USER node
ENV MESSENGER_PORT=3002 MESSENGER_DATA_DIR=/messenger-data
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3002/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
