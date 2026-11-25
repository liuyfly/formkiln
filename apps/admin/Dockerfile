# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f apps/admin/Dockerfile .

FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --frozen-lockfile \
    && pnpm turbo run build --filter=@formkiln/admin...

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3200 HOSTNAME=0.0.0.0
RUN addgroup -S formkiln && adduser -S -G formkiln formkiln
# The standalone server and its traced dependencies, then the static assets it serves.
COPY --from=build --chown=formkiln:formkiln /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=formkiln:formkiln /repo/apps/admin/.next/static ./apps/admin/.next/static
USER formkiln
EXPOSE 3200
CMD ["node", "apps/admin/server.js"]
