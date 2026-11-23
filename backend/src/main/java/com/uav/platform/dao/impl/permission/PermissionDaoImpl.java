package com.uav.platform.dao.impl.permission;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.permission.IPermissionDao;
import com.uav.platform.entity.permission.Permission;
import com.uav.platform.enums.permission.PermissionCode;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class PermissionDaoImpl extends HibernateGenericDao<Long, Permission>
        implements IPermissionDao {

    private static final Logger logger = LoggerFactory.getLogger(PermissionDaoImpl.class);

    public PermissionDaoImpl(final EntityManager entityManager) {
        super(Permission.class, entityManager);
    }

    @Override
    public Optional<Permission> findByCodeForUpdate(PermissionCode code) {
        return hql("select p from Permission p where p.code = :code", Permission.class)
                .setParameter("code", code)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public Optional<Permission> findByCode(PermissionCode code) {
        return hql("select e from Permission e where e.code = :code")
                .setParameter("code", code)
                .uniqueResultOptional();
    }
}
