# Disposable MinIO for integration tests

This image is only for `docker-compose.stabilization.yml` and CI. It is not a production deployment image.

The previously cached `minio/minio:latest` binary reported `RELEASE.2025-09-07T16-13-09Z`, commit `07c3a429bfed433e49018cb0f78a52145d4bedeb`, built with Go 1.24.6. On the clean hosted runner, Docker Hub denied the image pull; the matching Quay manifest was unavailable and the archived binary endpoint returned HTTP 410.

Build the **same upstream commit** using Go 1.24.6. The Dockerfile verifies the source archive SHA-256, uses the upstream dependency lock (`go.sum`, `-mod=readonly`), embeds version identifiers, retains the upstream license, and runs as an unprivileged user. No image is published to a registry. The first build needs access to Docker base images, GitHub source archives and the Go module proxy; subsequent local builds use Docker's cache.

Upstream sources:

- [Pinned MinIO source](https://github.com/minio/minio/tree/07c3a429bfed433e49018cb0f78a52145d4bedeb)
- [Upstream build and distribution instructions](https://github.com/minio/minio)
- [Pinned module/toolchain requirements](https://github.com/minio/minio/blob/07c3a429bfed433e49018cb0f78a52145d4bedeb/go.mod)

Use the existing disposable-stack commands and supply temporary credentials via environment variables. Do not put real credentials into the Dockerfile, build arguments, logs or evidence. The stack continues to bind only isolated loopback ports and does not reuse development data volumes.
