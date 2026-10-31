package com.uav.platform.repository.devicekey;

import com.uav.platform.entity.devicekey.DeviceApiKey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceApiKeyRepository
        extends JpaRepository<DeviceApiKey, Long>, JpaSpecificationExecutor<DeviceApiKey> {
    Optional<DeviceApiKey> findByKeyHash(String keyHash);

    List<DeviceApiKey> findAllByOrderByCreatedAtDescIdDesc();

    /** Active keys that expire inside the window (for the alert center). */
    @Query(
            "select k from DeviceApiKey k where k.revokedAt is null and k.expiresAt is not null"
                    + " and k.expiresAt > :now and k.expiresAt <= :until order by k.expiresAt")
    List<DeviceApiKey> findExpiringBetween(
            @Param("now") LocalDateTime now, @Param("until") LocalDateTime until);

    /** Throttled usage stamp: only writes when the previous stamp is older than the threshold. */
    @Modifying
    @Query(
            "update DeviceApiKey k set k.lastUsedAt = :now where k.id = :id"
                    + " and (k.lastUsedAt is null or k.lastUsedAt < :threshold)")
    int touch(
            @Param("id") Long id,
            @Param("now") LocalDateTime now,
            @Param("threshold") LocalDateTime threshold);
}
