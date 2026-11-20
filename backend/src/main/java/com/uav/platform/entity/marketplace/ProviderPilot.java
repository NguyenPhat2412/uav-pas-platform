package com.uav.platform.entity.marketplace;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.marketplace.ProviderPilotStatus;

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
@Table(name = "provider_pilots")
@Getter
@Setter
@NoArgsConstructor
public class ProviderPilot extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pilot_user_id")
    private AppUser pilotUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_uav_id")
    private Uav assignedUav;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Column(length = 160)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "license_number", length = 80)
    private String licenseNumber;

    @Column(length = 120)
    private String specialization;

    @Enumerated(EnumType.STRING)
    @Column(name = "pilot_status", nullable = false, length = 24)
    private ProviderPilotStatus pilotStatus = ProviderPilotStatus.AVAILABLE;

    @Column(nullable = false)
    private boolean deleted = false;
}
