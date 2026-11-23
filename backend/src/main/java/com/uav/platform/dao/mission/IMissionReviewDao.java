package com.uav.platform.dao.mission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.mission.MissionReview;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IMissionReviewDao extends IGenericDao<Long, MissionReview> {
    Optional<MissionReview> findByMissionId(Long missionId);

    List<MissionReview> findByMissionIdIn(Collection<Long> missionIds);

    List<MissionReview> findTop20ByOrderByUpdatedAtDescIdDesc();

    List<MissionReview> findAllWithMissionAndCustomer();

    List<Object[]> averageOverallRatingByOperator();

    List<MissionReview> findTop20ByMissionListingIdOrderByUpdatedAtDescIdDesc(Long listingId);

    List<MissionReview> findTop20ByMissionProviderIdOrderByUpdatedAtDescIdDesc(Long providerId);

    List<MissionReview> findByMissionListingId(Long listingId);

    List<MissionReview> findByMissionProviderId(Long providerId);
}
