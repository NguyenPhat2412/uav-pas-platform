package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.SavedFlightSite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface SavedFlightSiteRepository
        extends JpaRepository<SavedFlightSite, Long>, JpaSpecificationExecutor<SavedFlightSite> {

    List<SavedFlightSite> findByUserIdOrderByUpdatedAtDescIdDesc(Long userId);

    long countByUserId(Long userId);

    Optional<SavedFlightSite> findByIdAndUserId(Long id, Long userId);
}
