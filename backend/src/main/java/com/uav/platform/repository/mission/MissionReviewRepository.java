package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.MissionReview;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MissionReviewRepository
        extends JpaRepository<MissionReview, Long>, JpaSpecificationExecutor<MissionReview> {

    Optional<MissionReview> findByMissionId(Long missionId);

    List<MissionReview> findByMissionIdIn(Collection<Long> missionIds);

    @EntityGraph(attributePaths = {"mission", "mission.operator", "customer"})
    List<MissionReview> findTop20ByOrderByUpdatedAtDescIdDesc();

    @EntityGraph(attributePaths = {"mission", "mission.operator", "customer"})
    @Query("select r from MissionReview r")
    List<MissionReview> findAllWithMissionAndCustomer();

    @Query(
            "select r.mission.operator.id, avg(r.overallRating) from MissionReview r where r.mission.operator is not null and r.overallRating is not null group by r.mission.operator.id")
    List<Object[]> averageOverallRatingByOperator();
}
