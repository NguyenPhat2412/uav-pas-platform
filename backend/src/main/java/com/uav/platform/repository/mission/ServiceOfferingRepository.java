package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.enums.mission.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ServiceOfferingRepository
        extends JpaRepository<ServiceOffering, Long>, JpaSpecificationExecutor<ServiceOffering> {
    Optional<ServiceOffering> findByCode(String code);
}
