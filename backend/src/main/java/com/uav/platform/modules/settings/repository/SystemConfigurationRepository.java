package com.uav.platform.modules.settings.repository;

import com.uav.platform.modules.settings.entity.SystemConfiguration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemConfigurationRepository
        extends JpaRepository<SystemConfiguration, Long>,
                JpaSpecificationExecutor<SystemConfiguration> {
    Optional<SystemConfiguration> findByConfigKey(String configKey);

    List<SystemConfiguration> findByCategory(String category);
}
