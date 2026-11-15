package com.uav.platform.entity.marketplace;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.enums.marketplace.ProviderDocumentStatus;
import com.uav.platform.enums.marketplace.ProviderDocumentType;

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
@Table(name = "provider_documents")
@Getter
@Setter
@NoArgsConstructor
public class ProviderDocument extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private ProviderDocumentType documentType;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(name = "document_number", length = 80)
    private String documentNumber;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_asset_id")
    private MediaAsset mediaAsset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ProviderDocumentStatus status = ProviderDocumentStatus.PENDING;

    @Column(name = "reviewer_note", length = 500)
    private String reviewerNote;
}
