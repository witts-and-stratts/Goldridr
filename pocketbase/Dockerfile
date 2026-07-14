FROM alpine:3.22 AS download

ARG TARGETARCH
ARG POCKETBASE_VERSION=0.35.0

RUN apk add --no-cache unzip
ADD https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_${TARGETARCH}.zip /tmp/pocketbase.zip
RUN unzip /tmp/pocketbase.zip -d /out

FROM alpine:3.22

RUN addgroup -S -g 1000 pocketbase \
    && adduser -S -D -H -u 1000 -G pocketbase pocketbase \
    && mkdir -p /pb/pb_data /pb/pb_migrations \
    && chown -R pocketbase:pocketbase /pb

COPY --from=download --chown=pocketbase:pocketbase /out/pocketbase /usr/local/bin/pocketbase
COPY --chown=pocketbase:pocketbase pocketbase/pb_migrations /pb/pb_migrations

USER pocketbase
WORKDIR /pb
EXPOSE 8090

ENTRYPOINT ["pocketbase"]
