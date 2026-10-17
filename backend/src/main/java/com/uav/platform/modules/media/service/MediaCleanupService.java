package com.uav.platform.modules.media.service;

import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.repository.MissionMediaRepository;
import com.uav.platform.modules.mission.repository.MissionRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;

/** Each object is claimed by database row locks, including across application instances. */
@Service
public class MediaCleanupService {
    private final MediaAssetRepository assets;
    private final MissionRepository missions;
    private final MissionMediaRepository links;
    private final ObjectStorageService storage;
    private final EntityManager entityManager;
    private final TransactionTemplate transactions;
    private final boolean enabled;

    public MediaCleanupService(
            MediaAssetRepository assets,
            MissionRepository missions,
            MissionMediaRepository links,
            ObjectStorageService storage,
            EntityManager entityManager,
            PlatformTransactionManager manager,
            @Value("${app.media.cleanup-enabled:true}") boolean enabled) {
        this.assets = assets;
        this.missions = missions;
        this.links = links;
        this.storage = storage;
        this.entityManager = entityManager;
        this.enabled = enabled;
        transactions = new TransactionTemplate(manager);
        transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        transactions.setTimeout(30);
    }

    @Scheduled(
            fixedDelayString = "${app.media.cleanup-delay-ms:60000}",
            initialDelayString = "${app.media.cleanup-initial-delay-ms:60000}")
    public void scheduledCleanup() {
        if (enabled) runBatch();
    }

    public int runBatch() {
        LocalDateTime now = LocalDateTime.now();
        var ids = assets.cleanupCandidates(now, now.minusHours(24), 25);
        int completed = 0;
        for (Long id : ids) {
            try {
                if (process(id)) completed++;
            } catch (RuntimeException ex) {
                // The uncommitted claim rolls back. The persisted candidate remains for the next
                // poll.
                org.slf4j.LoggerFactory.getLogger(getClass())
                        .warn("Media cleanup transaction will retry for {}", id);
            }
        }
        return completed;
    }

    public boolean process(Long id) {
        return Boolean.TRUE.equals(
                transactions.execute(
                        status -> {
                            var snapshot = assets.findById(id).orElse(null);
                            if (snapshot == null) return false;
                            // Match media confirmation/mission attachment: mission first, asset
                            // second.
                            if ("MISSION".equals(snapshot.getLinkedEntityType())) {
                                missions.findByIdForUpdate(
                                        Long.parseLong(snapshot.getLinkedEntityId()));
                            }
                            var asset = assets.findByIdForUpdate(id).orElse(null);
                            if (asset == null) return false;
                            entityManager.refresh(asset, LockModeType.PESSIMISTIC_WRITE);
                            LocalDateTime now = LocalDateTime.now();
                            if (links.existsByMediaId(id)) return false;
                            if (!asset.isDeleted()) {
                                if (asset.isConfirmed()
                                        || !MediaUploadPolicy.expired(asset.getCreatedAt(), now))
                                    return false;
                                asset.queueDeletion(now);
                            }
                            if (asset.getDeleteAfter() != null
                                    && asset.getDeleteAfter().isAfter(now)) return false;
                            try {
                                // Idempotent even after storage deletion succeeded but this
                                // transaction crashed.
                                storage.deleteObject(asset.getObjectKey());
                                asset.deletionSucceeded(now);
                                return true;
                            } catch (RuntimeException ex) {
                                asset.deletionFailed(now);
                                return false;
                            }
                        }));
    }
}
