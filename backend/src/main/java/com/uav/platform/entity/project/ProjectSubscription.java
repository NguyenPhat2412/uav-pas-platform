package com.uav.platform.entity.project;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.project.ProjectSubscriptionStatus;
import com.uav.platform.enums.project.SubscriptionScheduleType;

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
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_subscriptions")
@Getter
@Setter
@NoArgsConstructor
public class ProjectSubscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private AppUser customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "listing_id", nullable = false)
    private MarketplaceListing listing;

    @Column(name = "area_geojson", columnDefinition = "TEXT")
    private String areaGeoJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_type", nullable = false, length = 24)
    private SubscriptionScheduleType scheduleType = SubscriptionScheduleType.ONCE;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "next_run_date")
    private LocalDate nextRunDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal units = BigDecimal.ONE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ProjectSubscriptionStatus status = ProjectSubscriptionStatus.ACTIVE;

    @Column(length = 1000)
    private String note;

    @Column(nullable = false)
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
