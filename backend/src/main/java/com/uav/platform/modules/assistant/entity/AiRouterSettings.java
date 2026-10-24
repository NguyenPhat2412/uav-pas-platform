package com.uav.platform.modules.assistant.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** The one row (id = 1) describing how the assistant reaches the 9router gateway. */
@Entity
@Table(name = "ai_router_settings")
@Getter
@Setter
@NoArgsConstructor
public class AiRouterSettings {
    public static final short SINGLETON_ID = 1;

    @Id private Short id;

    @Column(name = "base_url", nullable = false, length = 255)
    private String baseUrl;

    @Column(name = "api_key_cipher", columnDefinition = "TEXT")
    private String apiKeyCipher;

    @Column(name = "api_key_hint", length = 8)
    private String apiKeyHint;

    @Column(name = "mode1_label", nullable = false, length = 40)
    private String mode1Label;

    @Column(name = "mode1_model", length = 120)
    private String mode1Model;

    @Column(name = "mode2_label", nullable = false, length = 40)
    private String mode2Label;

    @Column(name = "mode2_model", length = 120)
    private String mode2Model;

    @Column(name = "system_prompt", length = 4000)
    private String systemPrompt;

    @Column(nullable = false)
    private boolean enabled;

    @Version private long version;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
