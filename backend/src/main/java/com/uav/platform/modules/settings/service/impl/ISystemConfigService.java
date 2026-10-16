package com.uav.platform.modules.settings.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.settings.config.request.UpdateConfigurationRequest;
import com.uav.platform.modules.settings.config.response.SystemConfigurationResponse;
import com.uav.platform.modules.settings.entity.SystemConfiguration;
import com.uav.platform.modules.settings.mapper.SystemConfigMapper;
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
        return configRepository.findAll().stream().map(SystemConfigMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SystemConfigurationResponse getByKey(String key) {
        SystemConfiguration cfg = configRepository.findByConfigKey(key)
            .orElseThrow(() -> SystemException.notFound("Config key not found: " + key));
        return SystemConfigMapper.toResponse(cfg);
    }

    @Override
    @Transactional(readOnly = true)
    public String valueOrDefault(String key, String fallback) {
        return configRepository.findByConfigKey(key).map(SystemConfiguration::getConfigValue).orElse(fallback);
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
        return SystemConfigMapper.toResponse(saved);
    }
}
