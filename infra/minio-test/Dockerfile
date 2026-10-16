# Disposable test server only. Rebuild the exact upstream release used locally
# because its former Docker Hub/Quay binaries are no longer downloadable.
FROM golang:1.24.6-bookworm AS build
ADD --checksum=sha256:8819e3e7817e46b7b3798f8f200ead208562e571563c2e040352378031abe9f2 https://codeload.github.com/minio/minio/tar.gz/07c3a429bfed433e49018cb0f78a52145d4bedeb /tmp/minio.tar.gz
RUN mkdir /src && tar -xzf /tmp/minio.tar.gz --strip-components=1 -C /src
WORKDIR /src
ENV CGO_ENABLED=0 GOTOOLCHAIN=local GOMAXPROCS=2
RUN go build -p=2 -mod=readonly -trimpath -ldflags="-s -w -X github.com/minio/minio/cmd.Version=2025-09-07T16:13:09Z -X github.com/minio/minio/cmd.ReleaseTag=RELEASE.2025-09-07T16-13-09Z -X github.com/minio/minio/cmd.CommitID=07c3a429bfed433e49018cb0f78a52145d4bedeb -X github.com/minio/minio/cmd.ShortCommitID=07c3a429bfed -X github.com/minio/minio/cmd.CopyrightYear=2025" -o /out/minio .

FROM debian:bookworm-slim
COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /src/LICENSE /usr/share/licenses/minio/LICENSE
RUN mkdir /data && chown 65532:65532 /data
LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="07c3a429bfed433e49018cb0f78a52145d4bedeb" \
      org.opencontainers.image.version="RELEASE.2025-09-07T16-13-09Z"
USER 65532:65532
ENV HOME=/tmp
EXPOSE 9000 9001
ENTRYPOINT ["/usr/local/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
