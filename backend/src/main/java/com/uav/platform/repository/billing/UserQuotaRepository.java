package com.uav.platform.repository.billing;

import com.uav.platform.entity.billing.UserQuota;

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

    /**
     * One row per plan with quotas: plan id, subscribers, paying (price above zero and paid
     * through {@code now}), average usage percent of capped quotas, quotas at or above 80% of
     * their hours, and paid periods ending between {@code now} and {@code soon}.
     */
    @org.springframework.data.jpa.repository.Query(
            "select p.id, count(q),"
                    + " sum(case when p.price > 0 and q.planPaidUntil >= :now then 1 else 0 end),"
                    + " avg(case when q.flightHoursLimit > 0"
                    + " then q.flightHoursUsed * 100.0 / q.flightHoursLimit end),"
                    + " sum(case when q.flightHoursLimit > 0"
                    + " and q.flightHoursUsed >= q.flightHoursLimit * 0.8 then 1 else 0 end),"
                    + " sum(case when q.planPaidUntil >= :now and q.planPaidUntil <= :soon"
                    + " then 1 else 0 end)"
                    + " from UserQuota q join q.plan p group by p.id")
    java.util.List<Object[]> usageByPlan(
            @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now,
            @org.springframework.data.repository.query.Param("soon") java.time.LocalDateTime soon);

    /** Customers at or above 80% of their hours, highest usage first: id, username, name, plan, used, limit. */
    @org.springframework.data.jpa.repository.Query(
            "select u.id, u.username, u.fullName, p.code, q.flightHoursUsed, q.flightHoursLimit"
                    + " from UserQuota q join q.user u join q.plan p"
                    + " where q.flightHoursLimit > 0 and q.flightHoursUsed >= q.flightHoursLimit * 0.8"
                    + " order by q.flightHoursUsed / q.flightHoursLimit desc, u.id")
    java.util.List<Object[]> nearLimit(org.springframework.data.domain.Pageable pageable);
}
