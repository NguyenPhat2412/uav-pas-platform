package com.uav.platform.modules.billing.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.entity.AppUser;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_quotas")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    public UserQuota(AppUser user, ServicePlan plan) {
        this.user = user;
        this.plan = plan;
        this.flightHoursUsed = 0.0;
        this.flightHoursLimit = plan.getMaxMonthlyFlightHours();
        this.concurrentUavsUsed = 0;
        this.concurrentUavsLimit = plan.getMaxConcurrentUavs();
        this.cycleStart = LocalDateTime.now();
        this.cycleEnd = LocalDateTime.now().plusMonths(1);
    }
}
