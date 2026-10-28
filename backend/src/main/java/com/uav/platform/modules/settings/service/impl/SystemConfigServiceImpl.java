package com.uav.platform.modules.settings.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.settings.dto.request.UpdateConfigurationRequest;
import com.uav.platform.modules.settings.dto.response.PublicSiteInfoResponse;
import com.uav.platform.modules.settings.dto.response.SystemConfigurationHistoryResponse;
import com.uav.platform.modules.settings.dto.response.SystemConfigurationResponse;
import com.uav.platform.modules.settings.entity.SystemConfiguration;
import com.uav.platform.modules.settings.mapper.SystemConfigMapper;
import com.uav.platform.modules.settings.repository.SystemConfigurationHistoryRepository;
import com.uav.platform.modules.settings.repository.SystemConfigurationRepository;
import com.uav.platform.modules.settings.service.SystemConfigService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@Transactional
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigurationRepository configRepository;
    private final SystemConfigMapper systemConfigMapper;
    private final SystemConfigurationHistoryRepository historyRepository;
    private final AuditLogService auditLogService;

    public SystemConfigServiceImpl(SystemConfigurationRepository configRepository) {
        this(
                configRepository,
                org.mapstruct.factory.Mappers.getMapper(SystemConfigMapper.class),
                null,
                null);
    }

    @Autowired
    public SystemConfigServiceImpl(
            SystemConfigurationRepository configRepository,
            SystemConfigMapper systemConfigMapper,
            @Autowired(required = false) SystemConfigurationHistoryRepository historyRepository,
            @Autowired(required = false) AuditLogService auditLogService) {
        this.configRepository = configRepository;
        this.systemConfigMapper = systemConfigMapper;
        this.historyRepository = historyRepository;
        this.auditLogService = auditLogService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SystemConfigurationResponse> listAll() {
        return configRepository.findAll().stream()
                .sorted(Comparator.comparing(SystemConfiguration::getConfigKey))
                .map(systemConfigMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SystemConfigurationResponse getByKey(String key) {
        return systemConfigMapper.toResponse(find(key));
    }

    @Override
    @Transactional(readOnly = true)
    public String valueOrDefault(String key, String fallback) {
        return configRepository
                .findByConfigKey(key)
                .map(SystemConfiguration::getConfigValue)
                .orElse(fallback);
    }

    private SystemConfiguration find(String key) {
        return configRepository
                .findByConfigKey(key)
                .orElseThrow(() -> SystemException.notFound("Config key not found: " + key));
    }

    private void validateRate(String value) {
        try {
            var rate = new java.math.BigDecimal(value);
            // VND has no minor unit: whole đồng only, so invoices and bank transfers can match.
            // NUMERIC(14,2) must represent the largest supported planned duration (24 hours).
            if (rate.signum() <= 0
                    || rate.stripTrailingZeros().scale() > 0
                    || rate.multiply(java.math.BigDecimal.valueOf(24))
                                    .compareTo(new java.math.BigDecimal("999999999999.99"))
                            > 0) throw new NumberFormatException();
        } catch (NumberFormatException ex) {
            throw SystemException.badRequest(
                    "Giá theo giờ phải là số đồng nguyên dương (không có phần lẻ) trước khi bật tính phí.",
                    "BILLING_HOURLY_RATE_INVALID");
        }
    }

    @Override
    public SystemConfigurationResponse update(
            String key, UpdateConfigurationRequest request, Authentication auth) {
        SystemConfiguration cfg = find(key);
        String requested = request.configValue();

        // Dedicated billing rules run first so their established messages are preserved.
        if ("billing.auto_generate_invoice".equals(key)) {
            if (requested == null || !java.util.Set.of("true", "false").contains(requested.trim()))
                throw SystemException.badRequest("Billing flag must be true or false");
            if ("true".equals(requested.trim()))
                validateRate(valueOrDefault("billing.hourly_rate_vnd", ""));
        }
        if ("billing.hourly_rate_vnd".equals(key))
            validateRate(requested == null ? "" : requested.trim());

        String value = SystemConfigurationOperations.validate(cfg, requested);
        String actor = auth != null ? auth.getName() : "ADMIN";
        String previous = cfg.getConfigValue();
        boolean changed = !Objects.equals(previous, value);

        cfg.setConfigValue(value);
        if (request.description() != null) {
            cfg.setDescription(request.description());
        }
        cfg.setUpdatedBy(actor);
        SystemConfiguration saved = configRepository.save(cfg);

        if (changed) {
            if (historyRepository != null)
                historyRepository.save(
                        SystemConfigurationOperations.history(key, previous, value, actor));
            if (auditLogService != null)
                auditLogService.record(
                        null,
                        actor,
                        AuditAction.UPDATE,
                        "SYSTEM_CONFIGURATION",
                        key,
                        "SETTING_CHANGED");
        }
        return systemConfigMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SystemConfigurationHistoryResponse> history(String key, int limit) {
        find(key);
        if (historyRepository == null) return List.of();
        int size = Math.max(1, Math.min(limit, 200));
        return historyRepository
                .findByConfigKeyOrderByChangedAtDescIdDesc(key, PageRequest.of(0, size))
                .stream()
                .map(systemConfigMapper::toHistoryResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicSiteInfoResponse publicSiteInfo() {
        Map<String, String> values = new LinkedHashMap<>();
        for (SystemConfiguration c :
                configRepository.findByPublicSettingTrueOrderByConfigKeyAsc()) {
            if (c.isPublicSetting() && c.getConfigValue() != null && !c.getConfigValue().isBlank())
                values.put(c.getConfigKey(), c.getConfigValue());
        }
        return new PublicSiteInfoResponse(
                values.get("contact.dispatch_hotline"),
                values.get("contact.email"),
                values.get("contact.address"),
                java.util.Collections.unmodifiableMap(values));
    }
}
