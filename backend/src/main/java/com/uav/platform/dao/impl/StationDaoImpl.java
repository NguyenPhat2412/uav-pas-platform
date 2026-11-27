package com.uav.platform.dao.impl;

import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.Station;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class StationDaoImpl extends HibernateGenericDao<Long, Station> implements IStationDao {

    private static final Logger logger = LoggerFactory.getLogger(StationDaoImpl.class);

    public StationDaoImpl(final EntityManager entityManager) {
        super(Station.class, entityManager);
    }

    @Override
    public boolean existsByCode(String code) {
        return !hql("select 1 from Station e where e.code = :code", Integer.class)
                .setParameter("code", code)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public Optional<Station> findByCode(String code) {
        return hql("select e from Station e where e.code = :code")
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public boolean hasReferences(Long id) {
        Object res =
                nativeSql(
                                "SELECT EXISTS (SELECT 1 FROM uavs WHERE station_id = :id)"
                                        + " OR EXISTS (SELECT 1 FROM equipment WHERE station_id = :id)"
                                        + " OR EXISTS (SELECT 1 FROM missions WHERE station_id = :id)"
                                        + " OR EXISTS (SELECT 1 FROM inventory_movements"
                                        + " WHERE from_station_id = :id OR to_station_id = :id)",
                                Object.class)
                        .setParameter("id", id)
                        .getSingleResult();
        return res instanceof Boolean b ? b : (res instanceof Number n && n.intValue() != 0);
    }
}
