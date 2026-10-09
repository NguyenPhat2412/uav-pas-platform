package com.uav.platform.modules.uav.entity;


import com.uav.platform.modules.uav.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "uav_status_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UavStatusHistory extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uav_id", nullable = false)
    private Uav uav;
    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private UavStatus fromStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 20)
    private UavStatus toStatus;
    @Column(length = 255)
    private String reason;
    @Column(length = 100)
    private String changedBy;

    public UavStatusHistory(Uav uav, UavStatus fromStatus, UavStatus toStatus, String reason, String changedBy) {
        this.uav = uav; this.fromStatus = fromStatus; this.toStatus = toStatus; this.reason = reason; this.changedBy = changedBy;
    }
}
