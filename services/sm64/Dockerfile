FROM node:24-bookworm-slim
WORKDIR /app
COPY server.mjs ./
USER node
EXPOSE 3004
HEALTHCHECK --interval=15s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3004/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
