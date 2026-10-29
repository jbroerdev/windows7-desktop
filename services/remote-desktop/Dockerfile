FROM node:24-bookworm-slim AS test
WORKDIR /app
COPY core.mjs protocol.mjs server.mjs test.mjs ./
RUN node --test test.mjs

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=test --chown=node:node /app/core.mjs /app/protocol.mjs /app/server.mjs ./
RUN mkdir /rdp-data && chown node:node /rdp-data
USER node
ENV RDP_PORT=3003 RDP_DATA_DIR=/rdp-data
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3003/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
