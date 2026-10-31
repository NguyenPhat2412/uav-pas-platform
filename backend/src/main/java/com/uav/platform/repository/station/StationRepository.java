package com.uav.platform.repository.station;

import com.uav.platform.entity.station.Station;
import com.uav.platform.enums.station.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface StationRepository
        extends JpaRepository<Station, Long>, JpaSpecificationExecutor<Station> {
    boolean existsByCode(String code);

    Optional<Station> findByCode(String code);
}
