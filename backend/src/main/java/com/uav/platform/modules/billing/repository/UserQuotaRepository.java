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
}
