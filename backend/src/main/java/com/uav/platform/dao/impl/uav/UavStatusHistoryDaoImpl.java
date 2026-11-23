package com.uav.platform.dao.impl.uav;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.uav.IUavStatusHistoryDao;
import com.uav.platform.entity.uav.UavStatusHistory;
import com.uav.platform.enums.uav.*;

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
