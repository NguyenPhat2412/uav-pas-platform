package com.uav.platform.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.common.util.AesStringAttributeConverter;
import com.uav.platform.enums.ProviderType;
import com.uav.platform.enums.ProviderVerificationStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider_profiles")
@Getter
@Setter
@NoArgsConstructor
public class ProviderProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(name = "display_name", nullable = false, length = 160)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 24)
    private ProviderType providerType = ProviderType.INDIVIDUAL;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "tax_or_id_number", length = 512)
    private String taxOrIdNumber;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "flight_license_number", length = 512)
    private String flightLicenseNumber;

    @Column(length = 2000)
    private String bio;

    @Column(length = 80)
    private String province;

    @Column(name = "service_radius_km", nullable = false)
    private int serviceRadiusKm = 50;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "contact_phone", length = 512)
    private String contactPhone;

    @Column(name = "bank_name", length = 120)
    private String bankName;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "bank_account_number", length = 512)
    private String bankAccountNumber;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "bank_account_holder", length = 512)
    private String bankAccountHolder;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 24)
    private ProviderVerificationStatus verificationStatus = ProviderVerificationStatus.DRAFT;

    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "commission_rate_override", precision = 5, scale = 4)
    private BigDecimal commissionRateOverride;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "review_count", nullable = false)
    private int reviewCount;

    @Column(name = "completed_missions_count", nullable = false)
    private int completedMissionsCount;
}
