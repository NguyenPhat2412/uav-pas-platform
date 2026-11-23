package com.uav.platform.dao.billing;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.billing.UserQuota;

import java.util.Optional;

public interface IUserQuotaDao extends IGenericDao<Long, UserQuota> {
    Optional<UserQuota> findByUserId(Long userId);

    void deleteByUserId(Long userId);

    java.util.List<Long> dueForRollover(
            java.time.LocalDateTime now, org.springframework.data.domain.Pageable pageable);

    java.util.List<Object[]> usageByPlan(java.time.LocalDateTime now, java.time.LocalDateTime soon);

    java.util.List<Object[]> nearLimit(org.springframework.data.domain.Pageable pageable);
}
