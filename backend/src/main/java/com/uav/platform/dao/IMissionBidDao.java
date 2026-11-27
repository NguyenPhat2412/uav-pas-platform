package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.MissionBid;

import java.util.List;
import java.util.Optional;

public interface IMissionBidDao extends IGenericDao<Long, MissionBid> {
    List<MissionBid> findByMissionIdOrderByProposedPriceVndAscCreatedAtAsc(Long missionId);

    List<MissionBid> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    Optional<MissionBid> findByMissionIdAndProviderId(Long missionId, Long providerId);
}
