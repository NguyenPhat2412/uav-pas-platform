package com.uav.platform.repository.station;

import com.uav.platform.entity.station.Station;
import com.uav.platform.enums.station.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StationRepository
        extends JpaRepository<Station, Long>, JpaSpecificationExecutor<Station> {
    boolean existsByCode(String code);

    Optional<Station> findByCode(String code);

    /** UAVs, equipment, missions or stock movements point at the station: it is part of history (BR-08). */
    @Query(
            value =
                    "SELECT EXISTS (SELECT 1 FROM uavs WHERE station_id = :id)"
                            + " OR EXISTS (SELECT 1 FROM equipment WHERE station_id = :id)"
                            + " OR EXISTS (SELECT 1 FROM missions WHERE station_id = :id)"
                            + " OR EXISTS (SELECT 1 FROM inventory_movements"
                            + " WHERE from_station_id = :id OR to_station_id = :id)",
            nativeQuery = true)
    boolean hasReferences(@Param("id") Long id);
}
