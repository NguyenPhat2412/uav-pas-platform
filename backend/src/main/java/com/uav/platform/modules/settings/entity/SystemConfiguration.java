package com.uav.platform.modules.settings.entity;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "system_configurations")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SystemConfiguration extends BaseEntity {

    @Column(name = "config_key", nullable = false, unique = true, length = 80)
    private String configKey;

    @Column(name = "config_value", nullable = false, length = 500)
    private String configValue;

    @Column(nullable = false, length = 40)
    private String category = "OPERATIONS";

    @Column(length = 255)
    private String description;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    public SystemConfiguration(
            String configKey,
            String configValue,
            String category,
            String description,
            String updatedBy) {
        this.configKey = configKey;
        this.configValue = configValue;
        this.category = category != null ? category : "OPERATIONS";
        this.description = description;
        this.updatedBy = updatedBy;
    }
}
