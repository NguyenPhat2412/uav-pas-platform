package com.uav.platform.modules.billing.repository;

import com.uav.platform.modules.billing.entity.UserQuota;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserQuotaRepository
        extends JpaRepository<UserQuota, Long>, JpaSpecificationExecutor<UserQuota> {
    Optional<UserQuota> findByUserId(Long userId);

    /** Quotas whose cycle ended or whose paid plan period lapsed; the rollover job refreshes them. */
    @org.springframework.data.jpa.repository.Query(
            "select q.user.id from UserQuota q where q.cycleEnd is null or q.cycleEnd <= :now"
                    + " or (q.planPaidUntil is not null and q.planPaidUntil <= :now) order by q.id")
    java.util.List<Long> dueForRollover(
            @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now,
            org.springframework.data.domain.Pageable pageable);
}
