package com.uav.platform.modules.assistant.repository;

import com.uav.platform.modules.assistant.entity.AiRouterSettings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AiRouterSettingsRepository
        extends JpaRepository<AiRouterSettings, Short>, JpaSpecificationExecutor<AiRouterSettings> {}
