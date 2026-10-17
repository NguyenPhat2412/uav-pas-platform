package com.uav.platform.modules.settings.entity;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "system_configurations")
@Getter
@Setter
@NoArgsConstructor
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
}
