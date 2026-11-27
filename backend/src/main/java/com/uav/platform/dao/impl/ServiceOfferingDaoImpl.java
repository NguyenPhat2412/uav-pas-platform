package com.uav.platform.dao.impl;

import com.uav.platform.dao.IServiceOfferingDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.ServiceOffering;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ServiceOfferingDaoImpl extends HibernateGenericDao<Long, ServiceOffering>
        implements IServiceOfferingDao {

    private static final Logger logger = LoggerFactory.getLogger(ServiceOfferingDaoImpl.class);

    public ServiceOfferingDaoImpl(final EntityManager entityManager) {
        super(ServiceOffering.class, entityManager);
    }

    @Override
    public Optional<ServiceOffering> findByCode(String code) {
        return hql("select e from UavService e where e.code = :code")
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public List<ServiceOffering> findByActiveTrueOrderByIdAsc() {
        return hql("select e from UavService e where e.active = true order by e.id asc")
                .getResultList();
    }
}
