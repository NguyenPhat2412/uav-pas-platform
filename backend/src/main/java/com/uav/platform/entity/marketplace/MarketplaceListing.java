package com.uav.platform.entity.marketplace;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.mission.MissionType;

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

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "marketplace_listings")
@Getter
@Setter
@NoArgsConstructor
public class MarketplaceListing extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id")
    private ProviderProfile provider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_service_id")
    private ServiceOffering categoryService;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 500)
    private String summary;

    @Column(length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_type", nullable = false, length = 30)
    private ListingType listingType = ListingType.FLIGHT_SERVICE;

    @Enumerated(EnumType.STRING)
    @Column(name = "mission_type", nullable = false, length = 30)
    private MissionType missionType = MissionType.AREA_INSPECTION;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_model", nullable = false, length = 30)
    private PricingModel pricingModel = PricingModel.PER_HOUR;

    @Column(name = "base_price_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal basePriceVnd = BigDecimal.ZERO;

    @Column(name = "min_booking_units", nullable = false, precision = 10, scale = 2)
    private BigDecimal minBookingUnits = BigDecimal.ONE;

    @Column(name = "security_deposit_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal securityDepositVnd = BigDecimal.ZERO;

    @Column(length = 80)
    private String province;

    @Column(name = "service_radius_km", nullable = false)
    private int serviceRadiusKm = 100;

    @Column(name = "equipment_specs", length = 1000)
    private String equipmentSpecs;

    @Column(name = "deliverables_summary", length = 1000)
    private String deliverablesSummary;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "on_site_sla_hours")
    private Integer onSiteSlaHours;

    @Column(name = "delivery_sla_hours")
    private Integer deliverySlaHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false, length = 30)
    private ListingModerationStatus moderationStatus = ListingModerationStatus.DRAFT;

    @Column(name = "moderation_note", length = 1000)
    private String moderationNote;

    @Column(name = "moderated_by", length = 100)
    private String moderatedBy;

    @Column(name = "moderated_at")
    private LocalDateTime moderatedAt;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "review_count", nullable = false)
    private int reviewCount;

    @Column(name = "booking_count", nullable = false)
    private int bookingCount;

    @Column(nullable = false)
    private boolean featured;

    @Column(nullable = false)
    private boolean deleted = false;
}
