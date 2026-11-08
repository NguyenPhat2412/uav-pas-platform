package com.uav.platform.entity.mission;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.user.AppUser;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "mission_reviews")
@Getter
@Setter
@NoArgsConstructor
public class MissionReview extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false, unique = true)
    private Mission mission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private AppUser customer;

    @Column(name = "overall_rating", nullable = false)
    private Integer overallRating;

    @Column(name = "data_quality_rating", nullable = false)
    private Integer dataQualityRating;

    @Column(name = "timeliness_rating", nullable = false)
    private Integer timelinessRating;

    @Column(name = "deliverables_accepted", nullable = false)
    private boolean deliverablesAccepted = true;

    @Column(length = 1500)
    private String comment;
}
