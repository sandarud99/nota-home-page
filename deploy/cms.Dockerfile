FROM node:22-bookworm-slim AS build
WORKDIR /app/cms
COPY cms/package.json cms/package-lock.json ./
RUN npm ci
COPY cms/config ./config
COPY cms/src ./src
COPY shared /app/shared
COPY cms/tsconfig.json ./
ARG STRAPI_PUBLIC_URL=http://127.0.0.1:1337
ENV NODE_ENV=production STRAPI_TELEMETRY_DISABLED=true
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app/cms
ENV NODE_ENV=production STRAPI_TELEMETRY_DISABLED=true HOST=:: PORT=1337
RUN apt-get update && apt-get install --no-install-recommends -y gosu && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/cms ./
COPY --chown=node:node cms/public ./public
COPY --chown=node:node cms/favicon.png ./
COPY --chown=node:node shared /app/shared
COPY --chown=node:node src/content/homepage.ts /app/src/content/homepage.ts
COPY --chown=node:node public/images /app/public/images
COPY --chown=node:node public/animations /app/public/animations
COPY --chmod=755 deploy/start-cms.sh /usr/local/bin/start-cms
RUN install -d -o node -g node /app/cms/database/migrations
EXPOSE 1337
ENTRYPOINT ["/usr/local/bin/start-cms"]
CMD ["node", "node_modules/@strapi/strapi/bin/strapi.js", "start"]
