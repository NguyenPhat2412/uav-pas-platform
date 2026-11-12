package com.uav.platform.repository.assistant;

import com.uav.platform.entity.assistant.AiRouterSettings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiRouterSettingsRepository
        extends JpaRepository<AiRouterSettings, Short>,
                JpaSpecificationExecutor<AiRouterSettings> {}
