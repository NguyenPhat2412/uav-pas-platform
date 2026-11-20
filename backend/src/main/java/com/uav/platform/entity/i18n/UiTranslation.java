package com.uav.platform.entity.i18n;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "ui_translations",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_ui_translations_key_locale",
                        columnNames = {"translation_key", "locale"}))
@Getter
@Setter
@NoArgsConstructor
public class UiTranslation extends BaseEntity {

    @Column(nullable = false, length = 60)
    private String namespace = "publicSite";

    @Column(name = "translation_key", nullable = false, length = 180)
    private String translationKey;

    @Column(nullable = false, length = 10)
    private String locale;

    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Column(length = 255)
    private String description;

    @Column(name = "updated_by", length = 100)
    private String updatedBy = "SYSTEM";
}
