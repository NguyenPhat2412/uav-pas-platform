package com.uav.platform.service.impl.storage;

import com.uav.platform.common.util.Hashing;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.entity.settings.SystemConfiguration;
import com.uav.platform.entity.storage.StorageDriveNode;
import com.uav.platform.enums.storage.DriveAllocationStrategy;
import com.uav.platform.enums.storage.DriveNodeHealth;
import com.uav.platform.enums.storage.StorageBackendMode;
import com.uav.platform.repository.settings.SystemConfigurationRepository;
import com.uav.platform.repository.storage.StorageDriveNodeRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class StorageAllocationOperations {
    public static final String KEY_PRIMARY_BACKEND = "storage.primary_backend";
    public static final String KEY_ALLOCATION_STRATEGY = "storage.allocation_strategy";
    public static final String KEY_FALLBACK_R2 = "storage.fallback_to_r2";
    public static final String KEY_TIERED_SMALL_MAX = "storage.tiered_small_file_max_bytes";
    public static final String KEY_OAUTH_CLIENT_ID = "storage.google_oauth_client_id";
    public static final String KEY_OAUTH_CLIENT_SECRET_ENC =
            "storage.google_oauth_client_secret_enc";

    private final StorageDriveNodeRepository driveNodes;
    private final SystemConfigurationRepository settings;
    private final String signingSecret;
    private final String fallbackPublicUrl;
    private final AtomicLong roundRobinSeq = new AtomicLong();

    @Autowired
    public StorageAllocationOperations(
            StorageDriveNodeRepository driveNodes,
            SystemConfigurationRepository settings,
            @Value("${app.jwt.secret:uav-pas-dev-storage-signing-secret}") String signingSecret,
            @Value("${app.public-url:http://localhost:8080}") String fallbackPublicUrl) {
        this.driveNodes = driveNodes;
        this.settings = settings;
        this.signingSecret =
                StringUtils.hasText(signingSecret)
                        ? signingSecret.trim()
                        : "uav-pas-dev-storage-signing-secret";
        this.fallbackPublicUrl =
                StringUtils.hasText(fallbackPublicUrl)
                        ? fallbackPublicUrl.trim()
                        : "http://localhost:8080";
    }

    public StorageBackendMode primaryBackend() {
        String raw = readSetting(KEY_PRIMARY_BACKEND, StorageBackendMode.GOOGLE_DRIVE.name());
        try {
            return StorageBackendMode.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return StorageBackendMode.GOOGLE_DRIVE;
        }
    }

    public DriveAllocationStrategy allocationStrategy() {
        String raw =
                readSetting(
                        KEY_ALLOCATION_STRATEGY, DriveAllocationStrategy.MOST_FREE_SPACE.name());
        try {
            return DriveAllocationStrategy.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return DriveAllocationStrategy.MOST_FREE_SPACE;
        }
    }

    public boolean fallbackToR2() {
        return Boolean.parseBoolean(readSetting(KEY_FALLBACK_R2, "true"));
    }

    public long tieredSmallFileMaxBytes() {
        try {
            return Long.parseLong(readSetting(KEY_TIERED_SMALL_MAX, "5242880").trim());
        } catch (NumberFormatException ex) {
            return 5_242_880L;
        }
    }

    public boolean shouldRouteSmallFileToR2(String contentType, long sizeBytes) {
        if (primaryBackend() != StorageBackendMode.HYBRID_TIERED) return false;
        long threshold = tieredSmallFileMaxBytes();
        boolean smallImage =
                contentType != null
                        && contentType.toLowerCase(Locale.ROOT).startsWith("image/")
                        && sizeBytes > 0
                        && sizeBytes <= threshold;
        return smallImage;
    }

    public Optional<StorageDriveNode> selectNode(
            String objectKey, String contentType, long sizeBytes) {
        StorageBackendMode mode = primaryBackend();
        if (mode == StorageBackendMode.R2) return Optional.empty();
        if (shouldRouteSmallFileToR2(contentType, sizeBytes)) return Optional.empty();

        List<StorageDriveNode> enabled =
                driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc();
        if (enabled.isEmpty()) return Optional.empty();

        String category = inferRouteTag(objectKey, contentType);
        List<StorageDriveNode> eligible =
                enabled.stream()
                        .filter(n -> n.getHealthStatus() != DriveNodeHealth.DOWN)
                        .filter(n -> matchesModule(n.getRoutedModules(), category))
                        .filter(n -> hasCapacity(n, sizeBytes))
                        .toList();
        if (eligible.isEmpty()) {
            // Relax module filter if a general Drive node has free space
            eligible =
                    enabled.stream()
                            .filter(n -> n.getHealthStatus() != DriveNodeHealth.DOWN)
                            .filter(n -> matchesModule(n.getRoutedModules(), "ALL"))
                            .filter(n -> hasCapacity(n, sizeBytes))
                            .toList();
        }
        if (eligible.isEmpty()) return Optional.empty();

        DriveAllocationStrategy strategy = allocationStrategy();
        List<StorageDriveNode> ranked = new ArrayList<>(eligible);
        return switch (strategy) {
            case ROUND_ROBIN -> {
                int idx = (int) Math.floorMod(roundRobinSeq.getAndIncrement(), ranked.size());
                yield Optional.of(ranked.get(idx));
            }
            case MODULE_PRIORITY -> {
                ranked.sort(
                        Comparator.comparingInt(
                                        (StorageDriveNode n) ->
                                                explicitModuleMatch(n.getRoutedModules(), category)
                                                        ? 0
                                                        : 1)
                                .thenComparing(
                                        Comparator.comparingInt(StorageDriveNode::getPriorityWeight)
                                                .reversed())
                                .thenComparing(
                                        Comparator.comparingLong(
                                                        StorageAllocationOperations
                                                                ::effectiveFreeBytes)
                                                .reversed()));
                yield Optional.of(ranked.get(0));
            }
            case MOST_FREE_SPACE -> {
                ranked.sort(
                        Comparator.comparingLong(StorageAllocationOperations::effectiveFreeBytes)
                                .reversed()
                                .thenComparing(
                                        Comparator.comparingInt(StorageDriveNode::getPriorityWeight)
                                                .reversed())
                                .thenComparingLong(n -> n.getId() == null ? 0L : n.getId()));
                yield Optional.of(ranked.get(0));
            }
        };
    }

    public static boolean hasCapacity(StorageDriveNode node, long incomingBytes) {
        Long limit = node.getQuotaLimitBytes();
        if (limit == null || limit <= 0) return true; // Unlimited Workspace Drive
        long used = node.getQuotaUsedBytes() == null ? 0L : Math.max(0L, node.getQuotaUsedBytes());
        long projected = used + Math.max(0L, incomingBytes);
        if (projected > limit) return false;
        int capPct = Math.max(50, Math.min(99, node.getMaxUsagePercent()));
        double pct = (projected * 100.0) / limit;
        return pct <= capPct;
    }

    static long effectiveFreeBytes(StorageDriveNode node) {
        Long limit = node.getQuotaLimitBytes();
        if (limit == null || limit <= 0) return Long.MAX_VALUE / 2;
        long used = node.getQuotaUsedBytes() == null ? 0L : Math.max(0L, node.getQuotaUsedBytes());
        return Math.max(0L, limit - used);
    }

    static String inferRouteTag(String objectKey, String contentType) {
        if (StringUtils.hasText(objectKey)) {
            String lower = objectKey.trim().toLowerCase(Locale.ROOT);
            if (lower.startsWith("training/")) return "TRAINING";
            if (lower.startsWith("mission/") || lower.startsWith("missions/"))
                return "MISSION_MEDIA";
            if (lower.startsWith("video/")) return "VIDEO";
            if (lower.startsWith("document/")) return "DOCUMENT";
            if (lower.startsWith("image/")) return "IMAGE";
        }
        if (StringUtils.hasText(contentType)) {
            String ct = contentType.trim().toLowerCase(Locale.ROOT);
            if (ct.startsWith("video/")) return "VIDEO";
            if (ct.startsWith("image/")) return "IMAGE";
            if (ct.startsWith("application/pdf")) return "DOCUMENT";
        }
        return "GENERAL";
    }

    static boolean matchesModule(String routedModules, String tag) {
        if (!StringUtils.hasText(routedModules)) return true;
        Set<String> tokens = parseTokens(routedModules);
        return tokens.isEmpty() || tokens.contains("ALL") || tokens.contains(tag);
    }

    private static boolean explicitModuleMatch(String routedModules, String tag) {
        if (!StringUtils.hasText(routedModules)) return false;
        Set<String> tokens = parseTokens(routedModules);
        return !tokens.contains("ALL") && tokens.contains(tag);
    }

    private static Set<String> parseTokens(String csv) {
        return Stream.of(csv.split(","))
                .map(s -> s.trim().toUpperCase(Locale.ROOT))
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());
    }

    public String buildSignedGatewayUploadUrl(
            String nodeCode, String objectKey, String contentType, long size, Duration validity) {
        long exp =
                Instant.now()
                        .plus(validity == null ? Duration.ofMinutes(15) : validity)
                        .getEpochSecond();
        String safeCt =
                StringUtils.hasText(contentType) ? contentType.trim() : "application/octet-stream";
        String sig = signUpload(nodeCode, objectKey, safeCt, size, exp);
        return baseUriBuilder()
                .path(ApiRoutes.StorageGateway.BASE)
                .path(ApiRoutes.StorageGateway.UPLOAD)
                .queryParam("node", nodeCode)
                .queryParam("key", objectKey)
                .queryParam("ct", safeCt)
                .queryParam("size", size)
                .queryParam("exp", exp)
                .queryParam("sig", sig)
                .build()
                .encode()
                .toUriString();
    }

    public String buildSignedGatewayDownloadUrl(String objectKey, Duration validity) {
        long exp =
                Instant.now()
                        .plus(validity == null ? Duration.ofMinutes(15) : validity)
                        .getEpochSecond();
        String sig = signDownload(objectKey, exp);
        return baseUriBuilder()
                .path(ApiRoutes.StorageGateway.BASE)
                .path(ApiRoutes.StorageGateway.DOWNLOAD)
                .queryParam("key", objectKey)
                .queryParam("exp", exp)
                .queryParam("sig", sig)
                .build()
                .encode()
                .toUriString();
    }

    public String signUpload(
            String nodeCode, String objectKey, String contentType, long size, long exp) {
        String payload =
                "PUT|"
                        + (nodeCode == null ? "" : nodeCode)
                        + "|"
                        + objectKey
                        + "|"
                        + (contentType == null ? "" : contentType)
                        + "|"
                        + size
                        + "|"
                        + exp;
        return Hashing.hmacSha256Hex(signingSecret, payload);
    }

    public boolean verifyUploadSignature(
            String nodeCode,
            String objectKey,
            String contentType,
            long size,
            Long exp,
            String sig) {
        if (!StringUtils.hasText(objectKey) || exp == null || !StringUtils.hasText(sig)) {
            return false;
        }
        if (Instant.now().getEpochSecond() > exp) return false;
        String expected = signUpload(nodeCode, objectKey, contentType, size, exp);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                sig.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
    }

    public String signDownload(String objectKey, long exp) {
        return Hashing.hmacSha256Hex(signingSecret, "GET|" + objectKey + "|" + exp);
    }

    public boolean verifyDownloadSignature(String objectKey, Long exp, String sig) {
        if (!StringUtils.hasText(objectKey) || exp == null || !StringUtils.hasText(sig)) {
            return false;
        }
        if (Instant.now().getEpochSecond() > exp) return false;
        String expected = signDownload(objectKey, exp);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                sig.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
    }

    public String signOAuthState(String rawPayload) {
        return Hashing.hmacSha256Hex(signingSecret, "OAUTH_STATE|" + rawPayload);
    }

    public boolean verifyOAuthState(String rawPayload, String sig) {
        if (!StringUtils.hasText(rawPayload) || !StringUtils.hasText(sig)) return false;
        String expected = signOAuthState(rawPayload);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                sig.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
    }

    public UriComponentsBuilder baseUriBuilder() {
        if (RequestContextHolder.getRequestAttributes() != null) {
            return ServletUriComponentsBuilder.fromCurrentContextPath();
        }
        return UriComponentsBuilder.fromUriString(fallbackPublicUrl);
    }

    private String readSetting(String key, String defaultValue) {
        try {
            return settings.findByConfigKey(key)
                    .map(SystemConfiguration::getConfigValue)
                    .filter(StringUtils::hasText)
                    .orElse(defaultValue);
        } catch (RuntimeException ex) {
            return defaultValue;
        }
    }
}
