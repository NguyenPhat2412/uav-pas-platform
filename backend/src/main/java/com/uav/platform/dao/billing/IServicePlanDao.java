package com.uav.platform.dao.billing;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.billing.ServicePlan;

import java.util.List;
import java.util.Optional;

public interface IServicePlanDao extends IGenericDao<Long, ServicePlan> {
    Optional<ServicePlan> findByCode(String code);

    List<ServicePlan> findByActiveTrue();
}
