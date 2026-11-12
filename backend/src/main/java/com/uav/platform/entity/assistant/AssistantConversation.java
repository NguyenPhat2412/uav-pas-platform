package com.uav.platform.entity.assistant;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** One assistant chat thread started by a user in one portal (CUSTOMER, OPERATIONS or ADMIN). */
@Entity
@Table(name = "assistant_conversations")
@Getter
@Setter
@NoArgsConstructor
public class AssistantConversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(name = "full_name", length = 160)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String portal;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(name = "message_count", nullable = false)
    private int messageCount;

    @Column(name = "total_tokens", nullable = false)
    private int totalTokens;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
