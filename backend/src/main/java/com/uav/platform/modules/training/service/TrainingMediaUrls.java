package com.uav.platform.modules.training.service;

import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.training.entity.TrainingAsset;
import com.uav.platform.modules.training.enums.TrainingAssetStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Per-request signed GET URLs for lesson media and covers. A storage that cannot sign (for example local
 * development without R2) yields null, so the rest of the response, external videos included, still works.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TrainingMediaUrls {
    /** Long enough to watch a lesson video, seeking included. */
    public static final Duration VALIDITY = Duration.ofHours(2);

    private final ObjectStorageService storage;

    public String signedGet(TrainingAsset asset) {
        if (asset == null || asset.getStatus() != TrainingAssetStatus.READY) return null;
        try {
            return storage.createSignedDownloadUrl(asset.getObjectKey(), VALIDITY);
        } catch (RuntimeException ex) {
            log.warn("Cannot sign training asset {}: {}", asset.getId(), ex.getMessage());
            return null;
        }
    }
}
