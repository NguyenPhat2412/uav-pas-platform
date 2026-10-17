package com.uav.platform.modules.station.repository;

import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface StationRepository
        extends JpaRepository<Station, Long>, JpaSpecificationExecutor<Station> {
    boolean existsByCode(String code);

    Optional<Station> findByCode(String code);
}
