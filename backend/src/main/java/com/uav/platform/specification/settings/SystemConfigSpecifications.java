package com.uav.platform.specification.settings;

import com.uav.platform.entity.settings.SystemConfiguration;

import org.springframework.data.jpa.domain.Specification;

public final class SystemConfigSpecifications {

    private SystemConfigSpecifications() {}

    public static Specification<SystemConfiguration> hasCategory(String category) {
        return (root, query, cb) ->
                (category == null || category.isBlank())
                        ? null
                        : cb.equal(root.get("category"), category);
    }

    public static Specification<SystemConfiguration> hasConfigKey(String configKey) {
        return (root, query, cb) ->
                (configKey == null || configKey.isBlank())
                        ? null
                        : cb.equal(root.get("configKey"), configKey);
    }
}
