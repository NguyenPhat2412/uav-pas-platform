package com.uav.platform.modules.settings.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Append-only record of one saved setting change. */
@Entity
@Table(name = "system_configuration_history")
@Getter
@Setter
@NoArgsConstructor
public class SystemConfigurationHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_key", nullable = false, length = 80)
    private String configKey;

    @Column(name = "old_value", length = 500)
    private String oldValue;

    @Column(name = "new_value", nullable = false, length = 500)
    private String newValue;

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;
}
