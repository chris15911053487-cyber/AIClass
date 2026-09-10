FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV DEPLOYMENT_TARGET=docker
RUN npm run build:docker

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production DEPLOYMENT_TARGET=docker HOST=0.0.0.0 PORT=8080 DATABASE_PATH=/data/academy.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /app/dist/standalone ./dist/standalone
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/drizzle ./drizzle
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/start.mjs"]
