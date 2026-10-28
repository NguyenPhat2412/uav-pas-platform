package com.uav.platform.modules.billing.repository;

import com.uav.platform.modules.billing.entity.MissionBillingJob;

import jakarta.persistence.LockModeType;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;

import java.time.LocalDateTime;
import java.util.*;

public interface MissionBillingJobRepository
        extends JpaRepository<MissionBillingJob, Long>,
                JpaSpecificationExecutor<MissionBillingJob> {
    Optional<MissionBillingJob> findByMissionId(Long missionId);

    @Query("select j.mission.id from MissionBillingJob j where j.id=:id")
    Optional<Long> missionIdForJob(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from MissionBillingJob j where j.id=:id")
    Optional<MissionBillingJob> findByIdForUpdate(Long id);

    @Query(
            "select j.id from MissionBillingJob j where j.status not in ('ISSUED','FAILED') and j.nextAttemptAt<=:now order by j.nextAttemptAt, j.id")
    List<Long> dueIds(LocalDateTime now, Pageable pageable);
}
