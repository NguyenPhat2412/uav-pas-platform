package com.uav.platform.modules.mission.repository;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.Mission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;
import java.util.Collection;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

public interface MissionRepository extends JpaRepository<Mission, Long>, JpaSpecificationExecutor<Mission> {
    Optional<Mission> findByCode(String code);

    // Database allocation remains unique across transactions and application instances.
    @Query(value = "select nextval('mission_code_seq')", nativeQuery = true)
    long nextCodeValue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Mission m where m.id = :id")
    Optional<Mission> findByIdForUpdate(Long id);

    boolean existsByUavIdAndStatusNotIn(Long uavId, Collection<MissionStatus> terminalStatuses);
    boolean existsByUavIdAndIdNotAndStatusNotIn(Long uavId, Long missionId, Collection<MissionStatus> terminalStatuses);
}
