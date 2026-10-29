FROM windows7-yt2009:upstream
USER root
COPY patch-upstream.py /integration/patch-upstream.py
RUN apk add --no-cache python3 && python3 /integration/patch-upstream.py
RUN mkdir -p /integration/seed/cache-code && cp -R /yt2009/assets /integration/seed/assets && cp /yt2009/back/cache_dir/*.js /integration/seed/cache-code/ && chown -R node:node /integration/seed
COPY --chown=node:node server.mjs /integration/server.mjs
USER node
ENV PORT=3005
EXPOSE 3005
HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=4 CMD node -e "fetch('http://127.0.0.1:3005/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node","/integration/server.mjs"]
