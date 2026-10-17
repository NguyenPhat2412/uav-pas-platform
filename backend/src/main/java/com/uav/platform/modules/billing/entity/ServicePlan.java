package com.uav.platform.modules.billing.entity;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "service_plans")
@Getter
@Setter
@NoArgsConstructor
public class ServicePlan extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "billing_cycle", nullable = false, length = 30)
    private String billingCycle = "MONTHLY";

    @Column(name = "max_monthly_flight_hours", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.NUMERIC)
    private Double maxMonthlyFlightHours = 20.0;

    @Column(name = "max_concurrent_uavs", nullable = false)
    private Integer maxConcurrentUavs = 1;

    @Column(name = "allow_sar_ai", nullable = false)
    private Boolean allowSarAi = false;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private Boolean active = true;
}
