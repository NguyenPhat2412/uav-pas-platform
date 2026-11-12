package com.uav.platform.entity.support;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "support_threads")
@Getter
@Setter
@NoArgsConstructor
public class SupportThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(name = "visitor_token", nullable = false, unique = true, length = 96)
    private String visitorToken;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(length = 160)
    private String organization;

    @Column(name = "contact_info", nullable = false, length = 160)
    private String contactInfo;

    @Column(nullable = false, length = 40)
    private String topic = "SURVEY_SERVICE";

    @Column(nullable = false, length = 24)
    private String source = "LIVE_WIDGET";

    @Column(nullable = false, length = 24)
    private String status = "OPEN";

    @Column(name = "unread_for_admin", nullable = false)
    private int unreadForAdmin = 1;

    @Column(name = "unread_for_visitor", nullable = false)
    private int unreadForVisitor = 0;

    @Column(name = "last_message_preview", length = 280)
    private String lastMessagePreview;

    @Column(name = "last_sender_role", nullable = false, length = 16)
    private String lastSenderRole = "VISITOR";

    @Column(name = "assigned_admin_username", length = 100)
    private String assignedAdminUsername;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
