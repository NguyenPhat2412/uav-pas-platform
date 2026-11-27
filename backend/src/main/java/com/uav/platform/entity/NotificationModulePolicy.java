package com.uav.platform.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.NotificationModuleCode;
import com.uav.platform.enums.NotificationSeverity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "notification_module_policies")
@Getter
@Setter
@NoArgsConstructor
public class NotificationModulePolicy extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "module_code", nullable = false, unique = true, length = 40)
    private NotificationModuleCode moduleCode = NotificationModuleCode.SYSTEM;

    @Column(name = "display_name_vi", nullable = false, length = 120)
    private String displayNameVi;

    @Column(name = "display_name_en", nullable = false, length = 120)
    private String displayNameEn;

    @Column(name = "display_name_ja", nullable = false, length = 120)
    private String displayNameJa;

    @Column(name = "description_vi", nullable = false, length = 400)
    private String descriptionVi;

    @Column(name = "description_en", nullable = false, length = 400)
    private String descriptionEn;

    @Column(name = "description_ja", nullable = false, length = 400)
    private String descriptionJa;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationSeverity severity = NotificationSeverity.ACTION;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(nullable = false)
    private Boolean mandatory = false;

    @Column(name = "in_app_enabled", nullable = false)
    private Boolean inAppEnabled = true;

    @Column(name = "screen_popup_enabled", nullable = false)
    private Boolean screenPopupEnabled = true;

    @Column(name = "desktop_os_enabled", nullable = false)
    private Boolean desktopOsEnabled = true;

    @Column(name = "mobile_push_enabled", nullable = false)
    private Boolean mobilePushEnabled = true;

    @Column(name = "email_enabled", nullable = false)
    private Boolean emailEnabled = false;

    @Column(name = "cooldown_seconds", nullable = false)
    private Integer cooldownSeconds = 0;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}
