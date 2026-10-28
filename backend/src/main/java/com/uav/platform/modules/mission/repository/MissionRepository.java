package com.uav.platform.modules.mission.repository;

import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.*;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.Optional;

public interface MissionRepository
        extends JpaRepository<Mission, Long>, JpaSpecificationExecutor<Mission> {
    Optional<Mission> findByCode(String code);

    // Database allocation remains unique across transactions and application instances.
    @Query(value = "select nextval('mission_code_seq')", nativeQuery = true)
    long nextCodeValue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Mission m where m.id = :id")
    Optional<Mission> findByIdForUpdate(Long id);

    /** Missions of one customer that still hold planned flight hours (not yet closed). */
    java.util.List<Mission> findByCustomerIdAndStatusNotIn(
            Long customerId, Collection<MissionStatus> closedStatuses);

    /** The mission a UAV is flying right now, used to tag telemetry sent without a mission id. */
    Optional<Mission> findFirstByUavIdAndStatusOrderByIdDesc(Long uavId, MissionStatus status);

    boolean existsByUavIdAndStatusNotIn(Long uavId, Collection<MissionStatus> terminalStatuses);

    boolean existsByUavIdAndIdNotAndStatusNotIn(
            Long uavId, Long missionId, Collection<MissionStatus> terminalStatuses);
}
