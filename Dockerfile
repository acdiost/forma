FROM node:22-alpine AS frontend
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.22 AS pocketbase
ARG TARGETARCH
WORKDIR /download
RUN apk add --no-cache ca-certificates curl unzip
COPY backend/version.json ./version.json
# Fixed release and digests match backend/version.json; no unverified third-party images.
RUN case "$TARGETARCH" in \
      amd64) SHA=0e1f609158ed945f809f8a02ae012aa0427129c66ebb63c1aee76f2c0309373f ;; \
      arm64) SHA=d22c66ceb67ca92b7d767f36d826e848a276bcfa3c197ead20bf87c42208984f ;; \
      *) exit 1 ;; \
    esac \
 && curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v0.40.6/pocketbase_0.40.6_linux_${TARGETARCH}.zip" -o pb.zip \
 && echo "$SHA  pb.zip" | sha256sum -c - \
 && unzip pb.zip pocketbase

FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata \
 && addgroup -g 10001 forma && adduser -D -H -u 10001 -G forma forma
WORKDIR /app
COPY --from=pocketbase /download/pocketbase /app/pocketbase
COPY --from=frontend /src/dist /app/pb_public
COPY backend/pb_hooks /app/pb_hooks
COPY backend/pb_migrations /app/pb_migrations
RUN mkdir /app/pb_data && chown -R forma:forma /app
USER forma
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8090/api/health || exit 1
ENTRYPOINT ["/app/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--automigrate=false", "--hooksWatch=false", "--dir=/app/pb_data", "--hooksDir=/app/pb_hooks", "--migrationsDir=/app/pb_migrations", "--publicDir=/app/pb_public"]
