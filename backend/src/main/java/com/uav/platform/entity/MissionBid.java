package com.uav.platform.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.MissionBidStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "mission_bids",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_mission_bids_mission_provider",
                        columnNames = {"mission_id", "provider_id"}))
@Getter
@Setter
@NoArgsConstructor
public class MissionBid extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false)
    private Mission mission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @Column(name = "proposed_price_vnd", nullable = false, precision = 14, scale = 2)
    private BigDecimal proposedPriceVnd;

    @Column(name = "estimated_delivery_hours")
    private Integer estimatedDeliveryHours;

    @Column(name = "proposal_note", length = 1500)
    private String proposalNote;

    @Column(name = "proposed_uav_model", length = 120)
    private String proposedUavModel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private MissionBidStatus status = MissionBidStatus.PENDING;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;
}
