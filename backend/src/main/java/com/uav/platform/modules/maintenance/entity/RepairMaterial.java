package com.uav.platform.modules.maintenance.entity;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Entity @Table(name = "repair_materials")
@Getter @NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RepairMaterial extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false) private RepairOrder order;
    @Column(nullable = false, length = 160) private String name;
    @Column(nullable = false, length = 30) private String unit;
    @Column(nullable = false, precision = 8, scale = 3) private BigDecimal quantity;
    @Column(nullable = false, precision = 10, scale = 0) private BigDecimal unitPrice;
    public RepairMaterial(RepairOrder order, String name, String unit, BigDecimal quantity, BigDecimal unitPrice) {
        this.order = order; this.name = name; this.unit = unit; this.quantity = quantity; this.unitPrice = unitPrice;
    }
    public BigDecimal lineTotal() { return quantity.multiply(unitPrice).setScale(0, RoundingMode.HALF_UP); }
}
