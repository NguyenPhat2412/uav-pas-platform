package com.uav.platform.modules.uav.repository;

import com.uav.platform.modules.uav.entity.UavTelemetry;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UavTelemetryRepository extends JpaRepository<UavTelemetry, Long>, JpaSpecificationExecutor<UavTelemetry> {
    Optional<UavTelemetry> findFirstByUavIdOrderByRecordedAtDesc(Long uavId);

    /** The newest sample of every UAV that has reported at least once. */
    @Query(value = "SELECT DISTINCT ON (uav_id) * FROM uav_telemetry ORDER BY uav_id, recorded_at DESC", nativeQuery = true)
    List<UavTelemetry> latestPerUav();
}
