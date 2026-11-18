package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.ProviderPilot;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ProviderPilotRepository
        extends JpaRepository<ProviderPilot, Long>, JpaSpecificationExecutor<ProviderPilot> {

    @EntityGraph(attributePaths = {"pilotUser", "assignedUav"})
    List<ProviderPilot> findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(Long providerId);

    @EntityGraph(attributePaths = {"pilotUser", "assignedUav", "provider"})
    Optional<ProviderPilot> findByIdAndProviderIdAndDeletedFalse(Long id, Long providerId);

    List<ProviderPilot> findByPilotUserIdAndDeletedFalse(Long pilotUserId);
}
