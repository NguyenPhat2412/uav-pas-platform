package com.uav.platform.modules.notification.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.notification.common.NotificationType;
import com.uav.platform.modules.user.entity.AppUser;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type = NotificationType.SYSTEM;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    public Notification(AppUser user, String title, String content, NotificationType type, String referenceType, Long referenceId) {
        this.user = user;
        this.title = title;
        this.content = content;
        this.type = type != null ? type : NotificationType.SYSTEM;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.isRead = false;
    }
}
