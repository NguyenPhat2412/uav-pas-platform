package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.MissionBid;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface MissionBidRepository
        extends JpaRepository<MissionBid, Long>, JpaSpecificationExecutor<MissionBid> {

    @EntityGraph(attributePaths = {"provider", "provider.user"})
    List<MissionBid> findByMissionIdOrderByProposedPriceVndAscCreatedAtAsc(Long missionId);

    @EntityGraph(attributePaths = {"mission", "mission.customer"})
    List<MissionBid> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    Optional<MissionBid> findByMissionIdAndProviderId(Long missionId, Long providerId);
}
