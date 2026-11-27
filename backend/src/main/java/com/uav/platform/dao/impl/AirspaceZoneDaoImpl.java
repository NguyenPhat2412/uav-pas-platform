package com.uav.platform.dao.impl;

import com.uav.platform.dao.IAirspaceZoneDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.AirspaceZone;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AirspaceZoneDaoImpl extends HibernateGenericDao<Long, AirspaceZone>
        implements IAirspaceZoneDao {

    private static final Logger logger = LoggerFactory.getLogger(AirspaceZoneDaoImpl.class);

    public AirspaceZoneDaoImpl(final EntityManager entityManager) {
        super(AirspaceZone.class, entityManager);
    }

    @Override
    public List<AirspaceZone> findByActiveTrueOrderByZoneTypeAscNameAsc() {
        return hql("select e from AirspaceZone e where e.active = true order by e.zoneType asc, e.name asc")
                .getResultList();
    }

    @Override
    public List<AirspaceZone> findAllByOrderByZoneTypeAscNameAsc() {
        return hql("select e from AirspaceZone e order by e.zoneType asc, e.name asc")
                .getResultList();
    }

    @Override
    public boolean existsByCodeIgnoreCase(String code) {
        return !hql(
                        "select 1 from AirspaceZone e where lower(e.code) = lower(:code)",
                        Integer.class)
                .setParameter("code", code)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id) {
        return !hql(
                        "select 1 from AirspaceZone e where lower(e.code) = lower(:code) and e.id <> :id",
                        Integer.class)
                .setParameter("code", code)
                .setParameter("id", id)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
