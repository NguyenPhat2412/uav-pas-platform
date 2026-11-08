package com.uav.platform.service.impl.media;

import com.uav.platform.dto.record.media.ObjectMetadata;
import com.uav.platform.dto.record.media.ObjectStream;
import com.uav.platform.enums.media.*;
import com.uav.platform.service.media.ObjectStorageService;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * S3-compatible signed URLs for MinIO in development and AWS S3 in production.
 * Credentials stay server-side; clients only receive short-lived PUT/GET URLs.
 */
@Service
public class S3CompatibleStorageService implements ObjectStorageService {
    private final String provider;
    private final String bucket;
    private final S3Presigner presigner;
    private final S3Client client;
    private final boolean ensureBucket;
    private final String publicEndpoint;
    private final String corsOrigin;

    public S3CompatibleStorageService(
            String provider,
            String endpoint,
            String bucket,
            String accessKey,
            String secretKey,
            String region,
            String publicEndpoint,
            boolean ensureBucket,
            String corsOrigin) {
        this(
                provider,
                endpoint,
                bucket,
                accessKey,
                secretKey,
                region,
                publicEndpoint,
                ensureBucket,
                corsOrigin,
                "");
    }

    @Autowired
    public S3CompatibleStorageService(
            @Value("${app.storage.provider:minio}") String provider,
            @Value("${app.storage.endpoint:http://localhost:9000}") String endpoint,
            @Value("${app.storage.bucket:uav-pas}") String bucket,
            @Value("${app.storage.access-key:minioadmin}") String accessKey,
            @Value("${app.storage.secret-key:minioadmin}") String secretKey,
            @Value("${app.storage.region:us-east-1}") String region,
            @Value("${app.storage.public-endpoint:}") String publicEndpoint,
            @Value("${app.storage.ensure-bucket:false}") boolean ensureBucket,
            @Value("${app.storage.cors-origin:http://localhost:3000}") String corsOrigin,
            @Value("${app.cors.allowed-origins:}") String appCorsAllowedOrigins) {
        this.provider = provider;
        this.bucket = bucket;
        this.publicEndpoint = publicEndpoint;
        this.corsOrigin =
                appCorsAllowedOrigins != null && !appCorsAllowedOrigins.isBlank()
                        ? (corsOrigin == null || corsOrigin.isBlank()
                                ? appCorsAllowedOrigins
                                : corsOrigin + "," + appCorsAllowedOrigins)
                        : corsOrigin;
        this.ensureBucket = ensureBucket;
        var credentials =
                StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey));
        var serviceConfiguration =
                S3Configuration.builder()
                        .pathStyleAccessEnabled("minio".equals(provider) || "test".equals(provider))
                        .build();
        var builder =
                S3Presigner.builder()
                        .region(Region.of(region))
                        .credentialsProvider(credentials)
                        .serviceConfiguration(serviceConfiguration);
        String signingEndpoint =
                publicEndpoint != null && !publicEndpoint.isBlank() ? publicEndpoint : endpoint;
        if (signingEndpoint != null && !signingEndpoint.isBlank())
            builder.endpointOverride(URI.create(signingEndpoint));
        this.presigner = builder.build();
        var clientBuilder =
                S3Client.builder()
                        .overrideConfiguration(
                                config ->
                                        config.apiCallTimeout(Duration.ofSeconds(15))
                                                .apiCallAttemptTimeout(Duration.ofSeconds(5)))
                        .region(Region.of(region))
                        .credentialsProvider(credentials)
                        .serviceConfiguration(serviceConfiguration);
        if (endpoint != null && !endpoint.isBlank())
            clientBuilder.endpointOverride(URI.create(endpoint));
        this.client = clientBuilder.build();
    }

    @Override
    public boolean bucketReachable() {
        try {
            client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            return true;
        } catch (RuntimeException unreachable) {
            return false;
        }
    }

    /** Pages through the bucket listing (1000 keys per call) without reading any object body. */
    @Override
    public com.uav.platform.dto.record.media.StorageUsage usage(long maxObjects) {
        long count = 0;
        long bytes = 0;
        String token = null;
        do {
            var response =
                    client.listObjectsV2(
                            software.amazon.awssdk.services.s3.model.ListObjectsV2Request.builder()
                                    .bucket(bucket)
                                    .continuationToken(token)
                                    .maxKeys(1000)
                                    .build());
            for (var object : response.contents()) {
                count++;
                if (object.size() != null) bytes += object.size();
            }
            token =
                    Boolean.TRUE.equals(response.isTruncated())
                            ? response.nextContinuationToken()
                            : null;
            if (token != null && count >= maxObjects)
                return new com.uav.platform.dto.record.media.StorageUsage(count, bytes, true);
        } while (token != null);
        return new com.uav.platform.dto.record.media.StorageUsage(count, bytes, false);
    }

    @PostConstruct
    void initializeBucket() {
        if (!ensureBucket) {
            if (!"test".equalsIgnoreCase(provider)) {
                try {
                    applyCors();
                } catch (RuntimeException ignored) {
                    // Best-effort CORS application when bucket creation is disabled.
                }
            }
            return;
        }
        try {
            client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            applyCors();
        } catch (S3Exception missing) {
            if (missing.statusCode() == 404
                    || "NoSuchBucket".equals(missing.awsErrorDetails().errorCode())) {
                client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                applyCors();
            } else throw missing;
        }
    }

    private void applyCors() {
        if (corsOrigin == null || corsOrigin.isBlank()) return;
        Set<String> origins = new LinkedHashSet<>();
        for (String part : corsOrigin.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) origins.add(trimmed);
        }
        if (origins.isEmpty()) return;
        try {
            client.putBucketCors(
                    software.amazon.awssdk.services.s3.model.PutBucketCorsRequest.builder()
                            .bucket(bucket)
                            .corsConfiguration(
                                    software.amazon.awssdk.services.s3.model.CORSConfiguration
                                            .builder()
                                            .corsRules(
                                                    software.amazon.awssdk.services.s3.model
                                                            .CORSRule.builder()
                                                            .allowedOrigins(origins)
                                                            .allowedMethods("GET", "PUT", "HEAD")
                                                            .allowedHeaders("*")
                                                            .exposeHeaders(
                                                                    List.of(
                                                                            "Accept-Ranges",
                                                                            "Content-Range",
                                                                            "Content-Length",
                                                                            "ETag"))
                                                            .maxAgeSeconds(900)
                                                            .build())
                                            .build())
                            .build());
        } catch (S3Exception ex) {
            // Some MinIO builds or scoped S3 tokens do not implement bucket CORS; proxy-level CORS
            // remains available.
            if (ex.statusCode() != 501 && ex.statusCode() != 403) throw ex;
        }
    }

    @PreDestroy
    void closeClients() {
        presigner.close();
        client.close();
    }

    @Override
    public String provider() {
        return provider;
    }

    @Override
    public String createSignedUploadUrl(String objectKey, String contentType) {
        return signedUpload(objectKey, contentType, null, Duration.ofMinutes(15));
    }

    @Override
    public String createSignedUploadUrl(
            String objectKey, String contentType, long size, Duration validity) {
        return signedUpload(objectKey, contentType, size, validity);
    }

    private String signedUpload(
            String objectKey, String contentType, Long size, Duration validity) {
        // Exact length is signed. Browsers supply Content-Length automatically for a File body.
        // The condition is signed: reusing a still-valid URL cannot overwrite delivered content.
        PutObjectRequest request =
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(objectKey)
                        .contentType(contentType)
                        .contentLength(size)
                        .ifNoneMatch("*")
                        .build();
        return presigner
                .presignPutObject(
                        builder -> builder.signatureDuration(validity).putObjectRequest(request))
                .url()
                .toString();
    }

    @Override
    public String createSignedDownloadUrl(String objectKey) {
        return createSignedDownloadUrl(objectKey, Duration.ofMinutes(15));
    }

    @Override
    public String createSignedDownloadUrl(String objectKey, Duration validity) {
        GetObjectRequest request = GetObjectRequest.builder().bucket(bucket).key(objectKey).build();
        return presigner
                .presignGetObject(
                        builder -> builder.signatureDuration(validity).getObjectRequest(request))
                .url()
                .toString();
    }

    @Override
    public boolean objectExists(String objectKey) {
        try {
            client.headObject(HeadObjectRequest.builder().bucket(bucket).key(objectKey).build());
            return true;
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) return false;
            throw ex;
        }
    }

    @Override
    public ObjectMetadata metadata(String objectKey) {
        var response =
                client.headObject(
                        HeadObjectRequest.builder().bucket(bucket).key(objectKey).build());
        return new ObjectMetadata(response.contentLength(), response.contentType());
    }

    @Override
    public byte[] readHeader(String objectKey) {
        var stream =
                client.getObject(
                        GetObjectRequest.builder()
                                .bucket(bucket)
                                .key(objectKey)
                                .range("bytes=0-63")
                                .build());
        try {
            return stream.readNBytes(64);
        } catch (java.io.IOException ex) {
            throw new IllegalStateException("Cannot read media header", ex);
        } finally {
            // ResponseInputStream.close() may drain an ignored-Range response with Apache
            // transport.
            // Abort instead so early termination never consumes the remaining object body.
            stream.abort();
        }
    }

    @Override
    public void deleteObject(String objectKey) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(objectKey).build());
    }

    @Override
    public ObjectStream openStream(String objectKey, String range) {
        GetObjectRequest.Builder builder = GetObjectRequest.builder().bucket(bucket).key(objectKey);
        if (range != null && !range.isBlank()) {
            builder.range(range.trim());
        }
        ResponseInputStream<GetObjectResponse> stream = client.getObject(builder.build());
        GetObjectResponse response = stream.response();
        long expected = response.contentLength() != null ? response.contentLength() : -1L;
        String acceptRanges =
                response.acceptRanges() != null && !response.acceptRanges().isBlank()
                        ? response.acceptRanges()
                        : "bytes";
        return new ObjectStream(
                new AbortOnEarlyCloseInputStream(stream, expected),
                response.contentType(),
                expected,
                response.contentRange(),
                acceptRanges,
                response.eTag());
    }

    @Override
    public void uploadObject(String objectKey, String contentType, long size, InputStream body) {
        PutObjectRequest request =
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(objectKey)
                        .contentType(contentType)
                        .contentLength(size)
                        .build();
        client.putObject(request, RequestBody.fromInputStream(body, size));
    }

    /**
     * Aborts the S3 response stream if closed before reaching EOF or the expected byte count, so a browser aborting
     * an initial GET to switch to Range requests never drains the remainder of a large PDF or video.
     */
    private static final class AbortOnEarlyCloseInputStream extends InputStream {
        private final ResponseInputStream<GetObjectResponse> delegate;
        private final long expectedLength;
        private long bytesRead;
        private boolean eof;
        private boolean closed;

        AbortOnEarlyCloseInputStream(
                ResponseInputStream<GetObjectResponse> delegate, long expectedLength) {
            this.delegate = delegate;
            this.expectedLength = expectedLength;
        }

        @Override
        public int read() throws IOException {
            int b = delegate.read();
            if (b == -1) {
                eof = true;
            } else {
                bytesRead++;
            }
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            int n = delegate.read(b, off, len);
            if (n == -1) {
                eof = true;
            } else if (n > 0) {
                bytesRead += n;
            }
            return n;
        }

        @Override
        public void close() throws IOException {
            if (closed) return;
            closed = true;
            if (eof || (expectedLength >= 0 && bytesRead >= expectedLength)) {
                delegate.close();
            } else {
                delegate.abort();
            }
        }
    }
}
