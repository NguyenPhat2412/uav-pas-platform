package com.uav.platform.dao.impl;

import com.uav.platform.dao.IServicePlanDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.ServicePlan;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ServicePlanDaoImpl extends HibernateGenericDao<Long, ServicePlan>
        implements IServicePlanDao {

    private static final Logger logger = LoggerFactory.getLogger(ServicePlanDaoImpl.class);

    public ServicePlanDaoImpl(final EntityManager entityManager) {
        super(ServicePlan.class, entityManager);
    }

    @Override
    public Optional<ServicePlan> findByCode(String code) {
        return hql("select e from ServicePlan e where e.code = :code")
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public List<ServicePlan> findByActiveTrue() {
        return hql("select e from ServicePlan e where e.active = true").getResultList();
    }
}
