package com.uav.platform.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.DriveAboutInfo;
import com.uav.platform.dto.record.DriveUploadedFile;
import com.uav.platform.dto.request.GoogleOAuthAuthorizeRequest;
import com.uav.platform.dto.response.StorageDriveNodeResponse;
import com.uav.platform.entity.StorageDriveNode;
import com.uav.platform.entity.StorageDriveObject;
import com.uav.platform.enums.DriveAuthType;
import com.uav.platform.enums.DriveNodeHealth;
import com.uav.platform.error.SystemException;

import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

final class StoragePoolOperations {

    private StoragePoolOperations() {}

    static Long[] computeQuotaTotals(List<StorageDriveNode> allNodes) {
        boolean anyUnlimited =
                allNodes.stream()
                        .anyMatch(
                                n ->
                                        n.isEnabled()
                                                && (n.getQuotaLimitBytes() == null
                                                        || n.getQuotaLimitBytes() <= 0));
        if (allNodes.isEmpty() || anyUnlimited) {
            return new Long[] {null, null};
        }
        long sumLimit = 0L;
        long sumFree = 0L;
        for (StorageDriveNode n : allNodes) {
            if (!n.isEnabled() || n.getQuotaLimitBytes() == null) continue;
            sumLimit += n.getQuotaLimitBytes();
            long used = n.getQuotaUsedBytes() == null ? 0L : n.getQuotaUsedBytes();
            sumFree += Math.max(0L, n.getQuotaLimitBytes() - used);
        }
        return new Long[] {sumLimit, sumFree};
    }

    static Map<String, Object> buildOAuthStateMap(
            GoogleOAuthAuthorizeRequest request,
            String actor,
            String redirectUri,
            String safeReturnOrigin) {
        Map<String, Object> stateMap = new LinkedHashMap<>();
        stateMap.put("actor", actor);
        stateMap.put(
                "displayName",
                request != null && StringUtils.hasText(request.displayName())
                        ? request.displayName().trim()
                        : "");
        stateMap.put(
                "rootFolderId",
                request != null && StringUtils.hasText(request.rootFolderId())
                        ? request.rootFolderId().trim()
                        : "");
        stateMap.put(
                "priorityWeight",
                request != null && request.priorityWeight() != null
                        ? request.priorityWeight()
                        : 100);
        stateMap.put(
                "maxUsagePercent",
                request != null && request.maxUsagePercent() != null
                        ? request.maxUsagePercent()
                        : 92);
        stateMap.put(
                "routedModules",
                normalizeModules(request == null ? null : request.routedModules()));
        stateMap.put("redirectUri", redirectUri);
        stateMap.put("returnOrigin", safeReturnOrigin);
        stateMap.put("exp", Instant.now().plusSeconds(600).getEpochSecond());
        return stateMap;
    }

    static void applyOAuthCallbackNode(
            StorageDriveNode node,
            JsonNode stateJson,
            DriveAboutInfo about,
            String encrypted,
            String resolvedRootFolderId) {
        if (node.getCode() == null) {
            node.setCode(generateNodeCode(about.email()));
        }
        String displayName = stateJson.path("displayName").asText("");
        node.setDisplayName(
                StringUtils.hasText(displayName)
                        ? displayName
                        : (StringUtils.hasText(about.email())
                                ? "Google Drive · " + about.email()
                                : "Google Drive #" + node.getCode()));
        node.setAuthType(DriveAuthType.OAUTH2);
        node.setAccountEmail(about.email());
        node.setEncryptedCredentials(encrypted);
        node.setRootFolderId(resolvedRootFolderId);
        node.setEnabled(true);
        node.setPriorityWeight(stateJson.path("priorityWeight").asInt(100));
        node.setMaxUsagePercent(stateJson.path("maxUsagePercent").asInt(92));
        node.setRoutedModules(normalizeModules(stateJson.path("routedModules").asText("ALL")));
        applyAboutQuota(node, about);
    }

    static StorageDriveObject buildDriveObject(
            String objectKey, StorageDriveNode node, DriveUploadedFile uploaded) {
        StorageDriveObject obj = new StorageDriveObject();
        obj.setObjectKey(objectKey);
        obj.setNode(node);
        obj.setDriveFileId(uploaded.driveFileId());
        obj.setDriveFolderId(uploaded.driveFolderId());
        obj.setModuleFolder(uploaded.moduleFolder());
        obj.setFileName(uploaded.fileName());
        obj.setContentType(uploaded.contentType());
        obj.setSizeBytes(uploaded.sizeBytes());
        return obj;
    }

    static StorageDriveNodeResponse toNodeDto(StorageDriveNode n, long objCount, long objBytes) {
        Long limit = n.getQuotaLimitBytes();
        Long used = n.getQuotaUsedBytes();
        Long free =
                limit != null && limit > 0
                        ? Math.max(0L, limit - (used == null ? 0L : used))
                        : null;
        Double pct =
                limit != null && limit > 0 && used != null
                        ? Math.round((used * 1000.0) / limit) / 10.0
                        : null;
        return new StorageDriveNodeResponse(
                n.getId(),
                n.getCode(),
                n.getDisplayName(),
                n.getAuthType(),
                n.getAccountEmail(),
                n.getRootFolderId(),
                n.isEnabled(),
                n.getPriorityWeight(),
                n.getMaxUsagePercent(),
                n.getRoutedModules(),
                limit,
                used,
                n.getQuotaDriveBytes(),
                free,
                pct,
                objCount,
                objBytes,
                n.getHealthStatus(),
                n.getLastError(),
                n.getLastCheckedAt(),
                n.getCreatedAt());
    }

    static void applyAboutQuota(StorageDriveNode node, DriveAboutInfo about) {
        node.setQuotaLimitBytes(about.limitBytes());
        node.setQuotaUsedBytes(about.usedBytes());
        node.setQuotaDriveBytes(about.driveBytes());
        node.setLastError(null);
        node.setLastCheckedAt(LocalDateTime.now());
        applyHealthFromQuota(node);
    }

    static void applyHealthFromQuota(StorageDriveNode node) {
        if (!StorageAllocationOperations.hasCapacity(node, 0L)) {
            node.setHealthStatus(DriveNodeHealth.QUOTA_FULL);
        } else {
            node.setHealthStatus(DriveNodeHealth.UP);
        }
    }

    static JsonNode verifyAndParseState(
            String state, StorageAllocationOperations allocator, ObjectMapper mapper) {
        if (!StringUtils.hasText(state) || !state.contains(".")) {
            throw SystemException.badRequest(
                    "Phiên xác thực OAuth không hợp lệ.", "DRIVE_OAUTH_STATE_INVALID");
        }
        int dot = state.lastIndexOf('.');
        String encoded = state.substring(0, dot);
        String sig = state.substring(dot + 1);
        if (!allocator.verifyOAuthState(encoded, sig)) {
            throw SystemException.badRequest(
                    "Chữ ký phiên xác thực OAuth không hợp lệ.", "DRIVE_OAUTH_STATE_INVALID");
        }
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(encoded);
            JsonNode json = mapper.readTree(decoded);
            long exp = json.path("exp").asLong(0L);
            if (Instant.now().getEpochSecond() > exp) {
                throw SystemException.badRequest(
                        "Phiên xác thực Google OAuth đã hết hạn (quá 10 phút).",
                        "DRIVE_OAUTH_STATE_EXPIRED");
            }
            return json;
        } catch (SystemException ex) {
            throw ex;
        } catch (Exception ex) {
            throw SystemException.badRequest(
                    "Dữ liệu trạng thái OAuth không hợp lệ.", "DRIVE_OAUTH_STATE_INVALID");
        }
    }

    static String sanitizeReturnOrigin(
            String candidate, Set<String> allowedOrigins, String publicAppUrl) {
        if (StringUtils.hasText(candidate)) {
            String trimmed = candidate.trim().replaceAll("/+$", "");
            if (allowedOrigins.contains(trimmed)
                    || trimmed.matches("^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$")) {
                return trimmed;
            }
        }
        return publicAppUrl.replaceAll("/+$", "");
    }

    static URI buildCallbackRedirect(String origin, boolean ok, String info) {
        UriComponentsBuilder b =
                UriComponentsBuilder.fromUriString(origin + "/admin/infrastructure/storage");
        if (ok) {
            b.queryParam("driveConnected", info);
        } else {
            b.queryParam("driveError", info);
        }
        return b.build().encode().toUri();
    }

    static String normalizeModules(String raw) {
        if (!StringUtils.hasText(raw)) return "ALL";
        List<String> parts =
                Arrays.stream(raw.split(","))
                        .map(s -> s.trim().toUpperCase(Locale.ROOT))
                        .filter(StringUtils::hasText)
                        .distinct()
                        .toList();
        return parts.isEmpty() || parts.contains("ALL") ? "ALL" : String.join(",", parts);
    }

    static String generateNodeCode(String email) {
        String prefix = "gdrive";
        if (StringUtils.hasText(email) && email.contains("@")) {
            String local =
                    email.substring(0, email.indexOf('@'))
                            .toLowerCase(Locale.ROOT)
                            .replaceAll("[^a-z0-9]+", "-");
            if (StringUtils.hasText(local)) {
                prefix =
                        "gdrive-"
                                + (local.length() > 14 ? local.substring(0, 14) : local)
                                        .replaceAll("^-|-$", "");
            }
        }
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 6);
    }

    static String maskClientId(String clientId) {
        if (!StringUtils.hasText(clientId)) return null;
        String trimmed = clientId.trim();
        if (trimmed.length() <= 14) {
            return trimmed.substring(0, Math.min(4, trimmed.length())) + "…";
        }
        return trimmed.substring(0, 10) + "…" + trimmed.substring(trimmed.length() - 12);
    }
}
