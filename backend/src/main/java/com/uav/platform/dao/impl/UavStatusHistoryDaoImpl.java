package com.uav.platform.dao.impl;

import com.uav.platform.dao.IUavStatusHistoryDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.UavStatusHistory;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class UavStatusHistoryDaoImpl extends HibernateGenericDao<Long, UavStatusHistory>
        implements IUavStatusHistoryDao {

    private static final Logger logger = LoggerFactory.getLogger(UavStatusHistoryDaoImpl.class);

    public UavStatusHistoryDaoImpl(final EntityManager entityManager) {
        super(UavStatusHistory.class, entityManager);
    }
}
