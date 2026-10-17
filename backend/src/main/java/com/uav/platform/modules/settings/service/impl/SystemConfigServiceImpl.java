package com.uav.platform.modules.settings.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.settings.dto.request.UpdateConfigurationRequest;
import com.uav.platform.modules.settings.dto.response.SystemConfigurationResponse;
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
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigurationRepository configRepository;

    public SystemConfigServiceImpl(SystemConfigurationRepository configRepository) {
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
        SystemConfiguration cfg =
                configRepository
                        .findByConfigKey(key)
                        .orElseThrow(
                                () -> SystemException.notFound("Config key not found: " + key));
        return SystemConfigMapper.toResponse(cfg);
    }

    @Override
    @Transactional(readOnly = true)
    public String valueOrDefault(String key, String fallback) {
        return configRepository
                .findByConfigKey(key)
                .map(SystemConfiguration::getConfigValue)
                .orElse(fallback);
    }

    private void validateRate(String value) {
        try {
            var rate = new java.math.BigDecimal(value);
            // NUMERIC(14,2) must represent the largest supported planned duration (24 hours).
            if (rate.signum() <= 0
                    || rate.scale() > 2
                    || rate.multiply(java.math.BigDecimal.valueOf(24))
                                    .compareTo(new java.math.BigDecimal("999999999999.99"))
                            > 0) throw new NumberFormatException();
        } catch (NumberFormatException ex) {
            throw SystemException.badRequest(
                    "Configure an approved positive VND hourly price (up to two decimals) before enabling billing");
        }
    }

    @Override
    public SystemConfigurationResponse update(
            String key, UpdateConfigurationRequest request, Authentication auth) {
        SystemConfiguration cfg =
                configRepository
                        .findByConfigKey(key)
                        .orElseThrow(
                                () -> SystemException.notFound("Config key not found: " + key));

        if ("billing.auto_generate_invoice".equals(key)) {
            if (!java.util.Set.of("true", "false").contains(request.configValue()))
                throw SystemException.badRequest("Billing flag must be true or false");
            if ("true".equals(request.configValue()))
                validateRate(valueOrDefault("billing.hourly_rate_vnd", ""));
        }
        if ("billing.hourly_rate_vnd".equals(key)) validateRate(request.configValue());
        cfg.setConfigValue(request.configValue());
        if (request.description() != null) {
            cfg.setDescription(request.description());
        }
        cfg.setUpdatedBy(auth != null ? auth.getName() : "ADMIN");

        SystemConfiguration saved = configRepository.save(cfg);
        return SystemConfigMapper.toResponse(saved);
    }
}
