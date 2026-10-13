package com.uav.platform.modules.billing.repository;

import com.uav.platform.modules.billing.entity.ServicePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServicePlanRepository extends JpaRepository<ServicePlan, Long>, JpaSpecificationExecutor<ServicePlan> {
    Optional<ServicePlan> findByCode(String code);
    List<ServicePlan> findByActiveTrue();
}
