package com.uav.platform.service.training;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.entity.training.TrainingAsset;
import com.uav.platform.enums.training.TrainingAssetStatus;
import com.uav.platform.service.media.ObjectStorageService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Per-request signed GET/PUT URLs for lesson media and covers. When running inside an HTTP request with a
 * signing secret configured, returns a signed backend streaming/upload URL so browser clients (such as pdf.js
 * with HTTP Range requests and HTML5 video players) never fail on S3/R2 cross-origin restrictions.
 */
@Slf4j
@Component
public class TrainingMediaUrls {
    /** Long enough to watch a lesson video, seeking included. */
    public static final Duration VALIDITY = Duration.ofHours(2);

    private static final String HMAC_ALGO = "HmacSHA256";

    private final ObjectStorageService storage;
    private final String signingSecret;

    public TrainingMediaUrls(ObjectStorageService storage) {
        this(storage, null);
    }

    @Autowired
    public TrainingMediaUrls(
            ObjectStorageService storage, @Value("${app.jwt.secret:}") String signingSecret) {
        this.storage = storage;
        this.signingSecret = signingSecret;
    }

    public String signedGet(TrainingAsset asset) {
        if (asset == null || asset.getStatus() != TrainingAssetStatus.READY) return null;
        try {
            String directUrl = storage.createSignedDownloadUrl(asset.getObjectKey(), VALIDITY);
            if (canBuildBackendUrl(asset)) {
                return buildSignedBackendUrl("GET", asset.getId(), VALIDITY);
            }
            return directUrl;
        } catch (RuntimeException ex) {
            log.warn("Cannot sign training asset {}: {}", asset.getId(), ex.getMessage());
            return null;
        }
    }

    public String signedPut(TrainingAsset asset, Duration validity) {
        String directUrl =
                storage.createSignedUploadUrl(
                        asset.getObjectKey(),
                        asset.getContentType(),
                        asset.getSizeBytes(),
                        validity);
        if (canBuildBackendUrl(asset)) {
            return buildSignedBackendUrl("PUT", asset.getId(), validity);
        }
        return directUrl;
    }

    public boolean verifySignature(String method, Long assetId, Long exp, String sig) {
        if (assetId == null
                || exp == null
                || !StringUtils.hasText(sig)
                || !StringUtils.hasText(signingSecret)) {
            return false;
        }
        if (Instant.now().getEpochSecond() > exp) {
            return false;
        }
        String expected = sign(method, assetId, exp);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                sig.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
    }

    public String sign(String method, Long assetId, long exp) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            String payload = method.toUpperCase(Locale.ROOT) + ":" + assetId + ":" + exp;
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot sign training media URL", ex);
        }
    }

    private boolean canBuildBackendUrl(TrainingAsset asset) {
        return asset != null
                && asset.getId() != null
                && StringUtils.hasText(signingSecret)
                && RequestContextHolder.getRequestAttributes() != null;
    }

    private String buildSignedBackendUrl(String method, Long assetId, Duration validity) {
        long exp = Instant.now().plus(validity).getEpochSecond();
        String sig = sign(method, assetId, exp);
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path(ApiRoutes.Training.BASE)
                .path("/assets/")
                .path(String.valueOf(assetId))
                .path("/content")
                .queryParam("exp", exp)
                .queryParam("sig", sig)
                .build()
                .toUriString();
    }
}
