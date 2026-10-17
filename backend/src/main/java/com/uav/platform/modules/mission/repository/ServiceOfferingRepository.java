package com.uav.platform.modules.mission.repository;

import com.uav.platform.modules.mission.entity.ServiceOffering;
import com.uav.platform.modules.mission.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ServiceOfferingRepository
        extends JpaRepository<ServiceOffering, Long>, JpaSpecificationExecutor<ServiceOffering> {
    Optional<ServiceOffering> findByCode(String code);
}
