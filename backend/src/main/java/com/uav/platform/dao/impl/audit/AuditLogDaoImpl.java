package com.uav.platform.dao.impl.audit;

import com.uav.platform.dao.audit.IAuditLogDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.audit.AuditLog;
import com.uav.platform.enums.audit.*;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class AuditLogDaoImpl extends HibernateGenericDao<Long, AuditLog> implements IAuditLogDao {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogDaoImpl.class);

    public AuditLogDaoImpl(final EntityManager entityManager) {
        super(AuditLog.class, entityManager);
    }
}
