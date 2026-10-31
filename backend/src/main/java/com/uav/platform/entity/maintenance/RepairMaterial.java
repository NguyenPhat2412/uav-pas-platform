package com.uav.platform.entity.maintenance;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "repair_materials")
@Getter
@Setter
@NoArgsConstructor
public class RepairMaterial extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private RepairOrder order;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(nullable = false, precision = 8, scale = 3)
    private BigDecimal quantity;

    @Column(nullable = false, precision = 10, scale = 0)
    private BigDecimal unitPrice;

    public RepairMaterial(
            RepairOrder order,
            String name,
            String unit,
            BigDecimal quantity,
            BigDecimal unitPrice) {
        this.order = order;
        this.name = name;
        this.unit = unit;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
    }
}
