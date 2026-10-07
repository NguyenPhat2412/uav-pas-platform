package com.uav.platform.modules.mission.repository;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.Mission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;

public interface MissionRepository extends JpaRepository<Mission, Long>, JpaSpecificationExecutor<Mission> {
    Optional<Mission> findByCode(String code);
}
