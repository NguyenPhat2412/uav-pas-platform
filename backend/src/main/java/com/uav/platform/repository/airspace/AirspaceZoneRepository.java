package com.uav.platform.repository.airspace;

import com.uav.platform.entity.airspace.AirspaceZone;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AirspaceZoneRepository
        extends JpaRepository<AirspaceZone, Long>, JpaSpecificationExecutor<AirspaceZone> {

    List<AirspaceZone> findByActiveTrueOrderByZoneTypeAscNameAsc();

    List<AirspaceZone> findAllByOrderByZoneTypeAscNameAsc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}
