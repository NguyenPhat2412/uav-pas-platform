package com.uav.platform.entity.billing;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.user.AppUser;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_quotas")
@Getter
@Setter
@NoArgsConstructor
public class UserQuota extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private ServicePlan plan;

    @Column(name = "flight_hours_used", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double flightHoursUsed = 0.0;

    @Column(name = "flight_hours_limit", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double flightHoursLimit = 20.0;

    @Column(name = "concurrent_uavs_used", nullable = false)
    private Integer concurrentUavsUsed = 0;

    @Column(name = "concurrent_uavs_limit", nullable = false)
    private Integer concurrentUavsLimit = 1;

    @Column(name = "cycle_start")
    private LocalDateTime cycleStart;

    @Column(name = "cycle_end")
    private LocalDateTime cycleEnd;

    /** End of the period a paid plan invoice covers; null = no expiry (free or admin-assigned). */
    @Column(name = "plan_paid_until")
    private LocalDateTime planPaidUntil;
}
