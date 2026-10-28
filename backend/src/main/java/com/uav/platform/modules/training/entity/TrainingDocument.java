package com.uav.platform.modules.training.entity;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "training_documents")
@Getter
@Setter
@NoArgsConstructor
public class TrainingDocument extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, unique = true, length = 140)
    private String slug;

    @Column(name = "target_portal", nullable = false, length = 20)
    private String targetPortal;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false, length = 25)
    private String level;

    @Column(name = "version_tag", nullable = false, length = 25)
    private String versionTag = "SOP-2026.1";

    @Column(name = "estimated_minutes", nullable = false)
    private Integer estimatedMinutes = 15;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory = false;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false, length = 220)
    private String title;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(name = "content_markdown", nullable = false, columnDefinition = "TEXT")
    private String contentMarkdown;

    @Column(name = "checklist_json", nullable = false, columnDefinition = "TEXT")
    private String checklistJson = "[]";
}
