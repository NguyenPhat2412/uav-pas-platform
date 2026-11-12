package com.uav.platform.repository.settings;

import com.uav.platform.entity.settings.SystemConfigurationHistory;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemConfigurationHistoryRepository
        extends JpaRepository<SystemConfigurationHistory, Long>,
                JpaSpecificationExecutor<SystemConfigurationHistory> {
    List<SystemConfigurationHistory> findByConfigKeyOrderByChangedAtDescIdDesc(
            String configKey, Pageable pageable);
}
