package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.Mission;
import com.uav.platform.enums.mission.*;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
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

    @EntityGraph(attributePaths = {"uav", "operator", "station"})
    @Query("select m from Mission m where m.status not in :excludedStatuses")
    List<Mission> findActiveWithResourcesNotIn(
            @Param("excludedStatuses") Collection<MissionStatus> excludedStatuses);

    @Query(
            "select m.operator.id, count(m) from Mission m where m.status = com.uav.platform.enums.mission.MissionStatus.COMPLETED and m.operator is not null group by m.operator.id")
    List<Object[]> countCompletedByOperator();

    @EntityGraph(attributePaths = {"uav", "operator", "station", "customer"})
    @Query(
            "select m from Mission m where m.status <> com.uav.platform.enums.mission.MissionStatus.DRAFT")
    List<Mission> findAllNonDraftWithAssociations();
}
