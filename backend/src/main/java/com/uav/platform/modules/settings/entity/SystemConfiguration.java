package com.uav.platform.modules.settings.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.settings.enums.SettingValueType;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "value_type", nullable = false, length = 16)
    private SettingValueType valueType = SettingValueType.STRING;

    /** Numeric lower bound (INTEGER/DECIMAL) or minimum length (STRING). */
    @Column(name = "min_value", precision = 20, scale = 4)
    private BigDecimal minValue;

    /** Numeric upper bound (INTEGER/DECIMAL) or maximum length (STRING). */
    @Column(name = "max_value", precision = 20, scale = 4)
    private BigDecimal maxValue;

    /** Comma-separated choices for ENUM settings. */
    @Column(name = "allowed_values", length = 500)
    private String allowedValues;

    /** Optional full-match regular expression for STRING settings. */
    @Column(name = "value_pattern", length = 200)
    private String valuePattern;

    /** Exposed without authentication by the public site-info endpoint. */
    @Column(name = "is_public", nullable = false)
    private boolean publicSetting;
}
