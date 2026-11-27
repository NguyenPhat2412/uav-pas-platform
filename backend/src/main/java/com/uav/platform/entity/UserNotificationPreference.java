package com.uav.platform.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.NotificationModuleCode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_notification_preferences")
@Getter
@Setter
@NoArgsConstructor
public class UserNotificationPreference extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_code", nullable = false, length = 40)
    private NotificationModuleCode moduleCode = NotificationModuleCode.SYSTEM;

    @Column(nullable = false)
    private Boolean muted = false;

    @Column(name = "screen_popup_enabled", nullable = false)
    private Boolean screenPopupEnabled = true;

    @Column(name = "desktop_os_enabled", nullable = false)
    private Boolean desktopOsEnabled = true;

    @Column(name = "mobile_push_enabled", nullable = false)
    private Boolean mobilePushEnabled = true;

    @Column(name = "email_enabled", nullable = false)
    private Boolean emailEnabled = true;
}
