package com.uav.platform.modules.mission.repository;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.UavService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface UavServiceRepository extends JpaRepository<UavService, Long>, JpaSpecificationExecutor<UavService> {
    Optional<UavService> findByCode(String code);
}
