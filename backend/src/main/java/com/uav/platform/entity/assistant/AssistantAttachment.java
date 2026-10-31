package com.uav.platform.entity.assistant;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** An image sent with a user turn: a photo, or one frame sampled from a video (kind VIDEO_FRAME). */
@Entity
@Table(name = "assistant_attachments")
@Getter
@Setter
@NoArgsConstructor
public class AssistantAttachment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @Column(nullable = false, length = 16)
    private String kind;

    @Column(name = "mime_type", nullable = false, length = 32)
    private String mimeType;

    @Column(length = 160)
    private String name;

    @Column(name = "size_bytes", nullable = false)
    private Integer sizeBytes;

    @Column(nullable = false, columnDefinition = "BYTEA")
    private byte[] data;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
