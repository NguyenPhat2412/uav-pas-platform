package com.uav.platform.modules.settings.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.settings.config.request.UpdateConfigurationRequest;
import com.uav.platform.modules.settings.config.response.SystemConfigurationResponse;
import com.uav.platform.modules.settings.entity.SystemConfiguration;
import com.uav.platform.modules.settings.repository.SystemConfigurationRepository;
import com.uav.platform.modules.settings.service.SystemConfigService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ISystemConfigService implements SystemConfigService {

    private final SystemConfigurationRepository configRepository;

    public ISystemConfigService(SystemConfigurationRepository configRepository) {
        this.configRepository = configRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SystemConfigurationResponse> listAll() {
        return configRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SystemConfigurationResponse getByKey(String key) {
        SystemConfiguration cfg = configRepository.findByConfigKey(key)
            .orElseThrow(() -> SystemException.notFound("Config key not found: " + key));
        return toResponse(cfg);
    }

    @Override
    public SystemConfigurationResponse update(String key, UpdateConfigurationRequest request, Authentication auth) {
        SystemConfiguration cfg = configRepository.findByConfigKey(key)
            .orElseThrow(() -> SystemException.notFound("Config key not found: " + key));

        cfg.setConfigValue(request.configValue());
        if (request.description() != null) {
            cfg.setDescription(request.description());
        }
        cfg.setUpdatedBy(auth != null ? auth.getName() : "ADMIN");

        SystemConfiguration saved = configRepository.save(cfg);
        return toResponse(saved);
    }

    private SystemConfigurationResponse toResponse(SystemConfiguration c) {
        return new SystemConfigurationResponse(
            c.getId(),
            c.getConfigKey(),
            c.getConfigValue(),
            c.getCategory(),
            c.getDescription(),
            c.getUpdatedAt(),
            c.getUpdatedBy()
        );
    }
}
