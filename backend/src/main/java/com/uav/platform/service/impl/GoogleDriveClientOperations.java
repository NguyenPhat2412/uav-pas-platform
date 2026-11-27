package com.uav.platform.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.common.util.AesGcmCipher;
import com.uav.platform.dto.record.CachedToken;
import com.uav.platform.dto.record.DriveAboutInfo;
import com.uav.platform.dto.record.DriveUploadedFile;
import com.uav.platform.dto.record.ObjectMetadata;
import com.uav.platform.dto.record.ObjectStream;
import com.uav.platform.dto.record.ServiceAccountParsed;
import com.uav.platform.entity.StorageDriveNode;
import com.uav.platform.enums.DriveAuthType;
import com.uav.platform.error.SystemException;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class GoogleDriveClientOperations {
    static final String DEFAULT_ROOT_FOLDER_NAME = "UAV-PAS Storage";
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
    private static final String TOKEN_URI = "https://oauth2.googleapis.com/token";
    private static final String AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String DRIVE_API = "https://www.googleapis.com/drive/v3";
    private static final String DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
    private static final String FOLDER_MIME = "application/vnd.google-apps.folder";

    private final ObjectMapper mapper = new ObjectMapper();
    private final AesGcmCipher cipher;
    private final HttpClient http;
    private final Map<Long, CachedToken> tokenCache = new ConcurrentHashMap<>();
    private final Map<Long, Object> folderLocks = new ConcurrentHashMap<>();

    public GoogleDriveClientOperations(String secretMaterial, HttpClient http) {
        this.cipher = new AesGcmCipher(deriveKey(secretMaterial));
        this.http = http;
    }

    @Autowired
    public GoogleDriveClientOperations(
            @Value("${app.jwt.secret:uav-pas-dev-storage-cipher-fallback-secret}")
                    String secretMaterial) {
        this(
                secretMaterial,
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(15))
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .build());
    }

    private static byte[] deriveKey(String secretMaterial) {
        try {
            String effective =
                    StringUtils.hasText(secretMaterial)
                            ? secretMaterial.trim()
                            : "uav-pas-dev-storage-cipher-fallback-secret";
            return MessageDigest.getInstance("SHA-256")
                    .digest(
                            ("uav-pas-storage-drive-v1:" + effective)
                                    .getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    public String encryptSecret(String plainText) {
        try {
            return cipher.encrypt(plainText);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Cannot encrypt storage secret", ex);
        }
    }

    public String decryptSecret(String cipherText) {
        try {
            return cipher.decrypt(cipherText);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw SystemException.serviceUnavailable(
                    "Không thể giải mã thông tin xác thực ổ Google Drive.", "DRIVE_SECRET_INVALID");
        }
    }

    public String encryptOAuthCredentials(
            String clientId, String clientSecret, String refreshToken) {
        try {
            Map<String, String> payload = new LinkedHashMap<>();
            payload.put("clientId", clientId.trim());
            payload.put("clientSecret", clientSecret.trim());
            payload.put("refreshToken", refreshToken.trim());
            return encryptSecret(mapper.writeValueAsString(payload));
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot serialize OAuth credentials", ex);
        }
    }

    public ServiceAccountParsed encryptServiceAccountJson(String rawJson) {
        try {
            JsonNode root = mapper.readTree(rawJson);
            String clientEmail = text(root, "client_email");
            String privateKey = text(root, "private_key");
            if (!StringUtils.hasText(clientEmail) || !StringUtils.hasText(privateKey)) {
                throw SystemException.badRequest(
                        "JSON Service Account thiếu trường client_email hoặc private_key.",
                        "DRIVE_SA_JSON_INVALID");
            }
            parsePrivateKey(privateKey);
            Map<String, String> payload = new LinkedHashMap<>();
            payload.put("clientEmail", clientEmail.trim());
            payload.put("privateKeyPem", privateKey);
            return new ServiceAccountParsed(
                    clientEmail.trim(), encryptSecret(mapper.writeValueAsString(payload)));
        } catch (SystemException ex) {
            throw ex;
        } catch (Exception ex) {
            throw SystemException.badRequest(
                    "JSON Service Account không hợp lệ.", "DRIVE_SA_JSON_INVALID");
        }
    }

    public String buildOAuthAuthorizeUrl(String clientId, String redirectUri, String state) {
        return AUTH_URI
                + "?client_id="
                + enc(clientId.trim())
                + "&redirect_uri="
                + enc(redirectUri)
                + "&response_type=code"
                + "&scope="
                + enc(DRIVE_SCOPE)
                + "&access_type=offline"
                + "&prompt=consent"
                + "&include_granted_scopes=true"
                + "&state="
                + enc(state);
    }

    public String exchangeAuthorizationCode(
            String clientId, String clientSecret, String code, String redirectUri) {
        String form =
                "code="
                        + enc(code)
                        + "&client_id="
                        + enc(clientId)
                        + "&client_secret="
                        + enc(clientSecret)
                        + "&redirect_uri="
                        + enc(redirectUri)
                        + "&grant_type=authorization_code";
        JsonNode json = postForm(TOKEN_URI, form);
        String refreshToken = text(json, "refresh_token");
        if (!StringUtils.hasText(refreshToken)) {
            throw SystemException.badRequest(
                    "Google không trả về Refresh Token. Hãy thử kết nối lại và đồng ý cấp quyền ngoại tuyến.",
                    "DRIVE_OAUTH_NO_REFRESH_TOKEN");
        }
        return refreshToken.trim();
    }

    public void evictToken(Long nodeId) {
        if (nodeId != null) tokenCache.remove(nodeId);
    }

    public DriveAboutInfo fetchAbout(StorageDriveNode node) {
        String token = accessToken(node);
        HttpRequest req =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        DRIVE_API
                                                + "/about?fields=user(emailAddress,displayName),storageQuota(limit,usage,usageInDrive)"))
                        .timeout(Duration.ofSeconds(15))
                        .header("Authorization", "Bearer " + token)
                        .GET()
                        .build();
        JsonNode root = sendJson(req);
        String email = root.path("user").path("emailAddress").asText(null);
        JsonNode quota = root.path("storageQuota");
        Long limit = parseLongOrNull(quota, "limit");
        Long usage = parseLongOrNull(quota, "usage");
        Long inDrive = parseLongOrNull(quota, "usageInDrive");
        return new DriveAboutInfo(email, limit, usage, inDrive);
    }

    public String ensureRootFolder(StorageDriveNode node) {
        String token = accessToken(node);
        if (StringUtils.hasText(node.getRootFolderId())) {
            String id = node.getRootFolderId().trim();
            HttpRequest check =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            DRIVE_API
                                                    + "/files/"
                                                    + encPath(id)
                                                    + "?fields=id,name,trashed&supportsAllDrives=true"))
                            .timeout(Duration.ofSeconds(15))
                            .header("Authorization", "Bearer " + token)
                            .GET()
                            .build();
            JsonNode meta = sendJson(check);
            if (meta.path("trashed").asBoolean(false)) {
                throw SystemException.badRequest(
                        "Thư mục gốc trên Google Drive đang nằm trong thùng rác.",
                        "DRIVE_ROOT_FOLDER_TRASHED");
            }
            return id;
        }
        Optional<String> existing = findSubfolder(token, "root", DEFAULT_ROOT_FOLDER_NAME);
        String folderId =
                existing.orElseGet(() -> createFolder(token, "root", DEFAULT_ROOT_FOLDER_NAME));
        node.setRootFolderId(folderId);
        return folderId;
    }

    public DriveUploadedFile uploadStream(
            StorageDriveNode node,
            String objectKey,
            String contentType,
            long size,
            InputStream body) {
        String moduleFolder = resolveModuleFolder(objectKey);
        String fileName = resolveFileName(objectKey);
        String folderId = ensureModuleFolder(node, moduleFolder);
        String token = accessToken(node);
        String safeContentType =
                StringUtils.hasText(contentType) ? contentType.trim() : "application/octet-stream";

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("name", fileName);
        metadata.put("parents", List.of(folderId));
        metadata.put(
                "appProperties",
                Map.of(
                        "uavPasKey",
                        objectKey.length() > 110 ? objectKey.substring(0, 110) : objectKey));

        String sessionUri;
        try {
            HttpRequest initReq =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            DRIVE_UPLOAD_API
                                                    + "/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size"))
                            .timeout(Duration.ofSeconds(30))
                            .header("Authorization", "Bearer " + token)
                            .header("Content-Type", "application/json; charset=UTF-8")
                            .header("X-Upload-Content-Type", safeContentType)
                            .header("X-Upload-Content-Length", String.valueOf(Math.max(size, 0)))
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            mapper.writeValueAsString(metadata),
                                            StandardCharsets.UTF_8))
                            .build();
            HttpResponse<String> initResp =
                    http.send(initReq, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (initResp.statusCode() < 200 || initResp.statusCode() >= 300) {
                throw driveHttpFailure("initUpload", initResp.statusCode());
            }
            sessionUri =
                    initResp.headers()
                            .firstValue("Location")
                            .orElseThrow(() -> driveHttpFailure("missingUploadLocation", 502));
        } catch (SystemException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw driveUnavailable("Interrupted");
        } catch (IOException ex) {
            throw driveUnavailable(ex.getClass().getSimpleName());
        }

        try {
            HttpRequest.BodyPublisher publisher =
                    size <= 0
                            ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.fromPublisher(
                                    HttpRequest.BodyPublishers.ofInputStream(() -> body), size);
            HttpRequest putReq =
                    HttpRequest.newBuilder()
                            .uri(URI.create(sessionUri))
                            .timeout(Duration.ofMinutes(10))
                            .header("Content-Type", safeContentType)
                            .PUT(publisher)
                            .build();
            HttpResponse<String> putResp =
                    http.send(putReq, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (putResp.statusCode() < 200 || putResp.statusCode() >= 300) {
                throw driveHttpFailure("putUpload", putResp.statusCode());
            }
            JsonNode created = mapper.readTree(putResp.body());
            String driveFileId = text(created, "id");
            long uploadedSize = Optional.ofNullable(parseLongOrNull(created, "size")).orElse(size);
            return new DriveUploadedFile(
                    driveFileId, folderId, moduleFolder, fileName, safeContentType, uploadedSize);
        } catch (SystemException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw driveUnavailable("Interrupted");
        } catch (IOException ex) {
            throw driveUnavailable(ex.getClass().getSimpleName());
        }
    }

    public Optional<ObjectMetadata> headFile(
            StorageDriveNode node, String driveFileId, String registeredContentType) {
        String token = accessToken(node);
        HttpRequest req =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        DRIVE_API
                                                + "/files/"
                                                + encPath(driveFileId)
                                                + "?fields=id,mimeType,size,trashed&supportsAllDrives=true"))
                        .timeout(Duration.ofSeconds(15))
                        .header("Authorization", "Bearer " + token)
                        .GET()
                        .build();
        try {
            HttpResponse<String> resp =
                    http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() == 404) return Optional.empty();
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw driveHttpFailure("headFile", resp.statusCode());
            }
            JsonNode json = mapper.readTree(resp.body());
            if (json.path("trashed").asBoolean(false)) return Optional.empty();
            long size = Optional.ofNullable(parseLongOrNull(json, "size")).orElse(0L);
            String mime =
                    StringUtils.hasText(registeredContentType)
                            ? registeredContentType
                            : json.path("mimeType").asText("application/octet-stream");
            return Optional.of(new ObjectMetadata(size, mime));
        } catch (SystemException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw driveUnavailable("Interrupted");
        } catch (IOException ex) {
            throw driveUnavailable(ex.getClass().getSimpleName());
        }
    }

    public byte[] readHeader(StorageDriveNode node, String driveFileId, String contentType) {
        try (ObjectStream stream = openStream(node, driveFileId, contentType, "bytes=0-63")) {
            return stream.body().readNBytes(64);
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot read Google Drive media header", ex);
        }
    }

    public ObjectStream openStream(
            StorageDriveNode node, String driveFileId, String fallbackContentType, String range) {
        String token = accessToken(node);
        HttpRequest.Builder builder =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        DRIVE_API
                                                + "/files/"
                                                + encPath(driveFileId)
                                                + "?alt=media&supportsAllDrives=true&acknowledgeAbuse=true"))
                        .timeout(Duration.ofMinutes(5))
                        .header("Authorization", "Bearer " + token)
                        .GET();
        if (StringUtils.hasText(range)) {
            builder.header("Range", range.trim());
        }
        try {
            HttpResponse<InputStream> resp =
                    http.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
            int code = resp.statusCode();
            if (code == 404) {
                resp.body().close();
                throw SystemException.notFound(
                        "Không tìm thấy tệp trên Google Drive.", "FILE_NOT_FOUND");
            }
            if (code != 200 && code != 206) {
                resp.body().close();
                throw driveHttpFailure("openStream", code);
            }
            long contentLength = resp.headers().firstValueAsLong("Content-Length").orElse(-1L);
            String contentRange = resp.headers().firstValue("Content-Range").orElse(null);
            String contentType =
                    StringUtils.hasText(fallbackContentType)
                            ? fallbackContentType
                            : resp.headers()
                                    .firstValue("Content-Type")
                                    .orElse("application/octet-stream");
            String etag = resp.headers().firstValue("ETag").orElse(null);
            return new ObjectStream(
                    resp.body(), contentType, contentLength, contentRange, "bytes", etag);
        } catch (SystemException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw driveUnavailable("Interrupted");
        } catch (IOException ex) {
            throw driveUnavailable(ex.getClass().getSimpleName());
        }
    }

    public void deleteFile(StorageDriveNode node, String driveFileId) {
        String token = accessToken(node);
        HttpRequest req =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        DRIVE_API
                                                + "/files/"
                                                + encPath(driveFileId)
                                                + "?supportsAllDrives=true"))
                        .timeout(Duration.ofSeconds(20))
                        .header("Authorization", "Bearer " + token)
                        .DELETE()
                        .build();
        try {
            HttpResponse<String> resp =
                    http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() != 200 && resp.statusCode() != 204 && resp.statusCode() != 404) {
                throw driveHttpFailure("deleteFile", resp.statusCode());
            }
        } catch (SystemException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw driveUnavailable("Interrupted");
        } catch (IOException ex) {
            throw driveUnavailable(ex.getClass().getSimpleName());
        }
    }

    static String resolveModuleFolder(String objectKey) {
        if (!StringUtils.hasText(objectKey)) return "general";
        int slash = objectKey.indexOf('/');
        String prefix =
                (slash > 0 ? objectKey.substring(0, slash) : "general")
                        .trim()
                        .toLowerCase(Locale.ROOT);
        return switch (prefix) {
            case "training" -> "training";
            case "image" -> "images";
            case "video" -> "videos";
            case "document" -> "documents";
            case "mission", "missions" -> "missions";
            default -> prefix.replaceAll("[^a-z0-9_-]", "");
        };
    }

    static String resolveFileName(String objectKey) {
        if (!StringUtils.hasText(objectKey)) return "file.bin";
        int slash = objectKey.lastIndexOf('/');
        String leaf = slash >= 0 ? objectKey.substring(slash + 1) : objectKey;
        return StringUtils.hasText(leaf) ? leaf : "file.bin";
    }

    private String ensureModuleFolder(StorageDriveNode node, String moduleFolder) {
        Object lock =
                node.getId() == null
                        ? this
                        : folderLocks.computeIfAbsent(node.getId(), k -> new Object());
        synchronized (lock) {
            Map<String, String> cache = parseFolderCache(node.getFolderCacheJson());
            String cached = cache.get(moduleFolder);
            if (StringUtils.hasText(cached)) return cached;
            String rootId = ensureRootFolder(node);
            String token = accessToken(node);
            String subId =
                    findSubfolder(token, rootId, moduleFolder)
                            .orElseGet(() -> createFolder(token, rootId, moduleFolder));
            cache.put(moduleFolder, subId);
            try {
                node.setFolderCacheJson(mapper.writeValueAsString(cache));
            } catch (IOException ignored) {
                // Non-fatal cache serialization
            }
            return subId;
        }
    }

    private Optional<String> findSubfolder(String token, String parentId, String folderName) {
        String safeName = folderName.replace("\\", "\\\\").replace("'", "\\'");
        String safeParent = parentId.replace("\\", "\\\\").replace("'", "\\'");
        String q =
                "mimeType='"
                        + FOLDER_MIME
                        + "' and name='"
                        + safeName
                        + "' and '"
                        + safeParent
                        + "' in parents and trashed=false";
        HttpRequest req =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        DRIVE_API
                                                + "/files?q="
                                                + enc(q)
                                                + "&pageSize=1&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true"))
                        .timeout(Duration.ofSeconds(15))
                        .header("Authorization", "Bearer " + token)
                        .GET()
                        .build();
        JsonNode root = sendJson(req);
        JsonNode files = root.path("files");
        if (files.isArray() && !files.isEmpty()) {
            String id = text(files.get(0), "id");
            if (StringUtils.hasText(id)) return Optional.of(id);
        }
        return Optional.empty();
    }

    private String createFolder(String token, String parentId, String folderName) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("name", folderName);
            body.put("mimeType", FOLDER_MIME);
            if (!"root".equals(parentId)) {
                body.put("parents", List.of(parentId));
            }
            HttpRequest req =
                    HttpRequest.newBuilder()
                            .uri(URI.create(DRIVE_API + "/files?fields=id&supportsAllDrives=true"))
                            .timeout(Duration.ofSeconds(15))
                            .header("Authorization", "Bearer " + token)
                            .header("Content-Type", "application/json; charset=UTF-8")
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            mapper.writeValueAsString(body),
                                            StandardCharsets.UTF_8))
                            .build();
            JsonNode created = sendJson(req);
            String id = text(created, "id");
            if (!StringUtils.hasText(id)) throw driveHttpFailure("createFolder", 502);
            return id;
        } catch (IOException ex) {
            throw driveUnavailable("FolderSerializeError");
        }
    }

    private String accessToken(StorageDriveNode node) {
        Long nodeId = node.getId();
        if (nodeId != null) {
            CachedToken cached = tokenCache.get(nodeId);
            if (cached != null && cached.expiresAt().isAfter(Instant.now().plusSeconds(90))) {
                return cached.token();
            }
        }
        CachedToken refreshed = fetchFreshToken(node);
        if (nodeId != null) {
            tokenCache.put(nodeId, refreshed);
        }
        return refreshed.token();
    }

    private CachedToken fetchFreshToken(StorageDriveNode node) {
        try {
            JsonNode secret = mapper.readTree(decryptSecret(node.getEncryptedCredentials()));
            String form;
            if (node.getAuthType() == DriveAuthType.SERVICE_ACCOUNT) {
                String assertion =
                        signServiceAccountAssertion(
                                text(secret, "clientEmail"), text(secret, "privateKeyPem"));
                form =
                        "grant_type="
                                + enc("urn:ietf:params:oauth:grant-type:jwt-bearer")
                                + "&assertion="
                                + enc(assertion);
            } else {
                form =
                        "grant_type=refresh_token&client_id="
                                + enc(text(secret, "clientId"))
                                + "&client_secret="
                                + enc(text(secret, "clientSecret"))
                                + "&refresh_token="
                                + enc(text(secret, "refreshToken"));
            }
            JsonNode tokenJson = postForm(TOKEN_URI, form);
            String token = text(tokenJson, "access_token");
            long expiresIn = tokenJson.path("expires_in").asLong(3500L);
            if (!StringUtils.hasText(token)) {
                throw driveHttpFailure("emptyAccessToken", 401);
            }
            return new CachedToken(token, Instant.now().plusSeconds(Math.max(120L, expiresIn)));
        } catch (SystemException ex) {
            throw ex;
        } catch (Exception ex) {
            throw driveUnavailable(ex.getClass().getSimpleName());
        }
    }

    private String signServiceAccountAssertion(String clientEmail, String privateKeyPem)
            throws GeneralSecurityException, IOException {
        long now = Instant.now().getEpochSecond();
        String header = base64Url(mapper.writeValueAsBytes(Map.of("alg", "RS256", "typ", "JWT")));
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", clientEmail);
        claims.put("scope", DRIVE_SCOPE);
        claims.put("aud", TOKEN_URI);
        claims.put("iat", now);
        claims.put("exp", now + 3600L);
        String payload = base64Url(mapper.writeValueAsBytes(claims));
        String signingInput = header + "." + payload;

        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(parsePrivateKey(privateKeyPem));
        signature.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        return signingInput + "." + base64Url(signature.sign());
    }

    private static PrivateKey parsePrivateKey(String pem) throws GeneralSecurityException {
        String normalized =
                pem.replace("\\n", "\n")
                        .replace("-----BEGIN PRIVATE KEY-----", "")
                        .replace("-----END PRIVATE KEY-----", "")
                        .replaceAll("\\s+", "");
        byte[] der = Base64.getDecoder().decode(normalized);
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    private JsonNode postForm(String uri, String urlEncodedBody) {
        HttpRequest req =
                HttpRequest.newBuilder()
                        .uri(URI.create(uri))
                        .timeout(Duration.ofSeconds(15))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(urlEncodedBody))
                        .build();
        return sendJson(req);
    }

    private JsonNode sendJson(HttpRequest req) {
        try {
            HttpResponse<String> resp =
                    http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw driveHttpFailure("http", resp.statusCode());
            }
            return mapper.readTree(resp.body());
        } catch (SystemException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw driveUnavailable("Interrupted");
        } catch (IOException ex) {
            throw driveUnavailable(ex.getClass().getSimpleName());
        }
    }

    private Map<String, String> parseFolderCache(String json) {
        if (!StringUtils.hasText(json)) return new LinkedHashMap<>();
        try {
            return new LinkedHashMap<>(
                    mapper.readValue(json, new TypeReference<Map<String, String>>() {}));
        } catch (IOException ex) {
            return new LinkedHashMap<>();
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode child = node == null ? null : node.get(field);
        return child == null || child.isNull() ? null : child.asText();
    }

    private static Long parseLongOrNull(JsonNode node, String field) {
        String raw = text(node, field);
        if (!StringUtils.hasText(raw)) return null;
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String encPath(String segment) {
        return enc(segment).replace("+", "%20");
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static SystemException driveHttpFailure(String op, int status) {
        if (status == 401 || status == 403) {
            return SystemException.badRequest(
                    "Google Drive từ chối quyền truy cập (HTTP "
                            + status
                            + "). Kiểm tra lại quyền Drive API hoặc thư mục.",
                    "DRIVE_AUTH_REJECTED");
        }
        return SystemException.serviceUnavailable(
                "Kết nối Google Drive gặp lỗi (" + op + " HTTP " + status + ").",
                "DRIVE_UPSTREAM_ERROR");
    }

    private static SystemException driveUnavailable(String code) {
        return SystemException.serviceUnavailable(
                "Không thể kết nối tới Google Drive (" + code + ").", "DRIVE_UNAVAILABLE");
    }
}
