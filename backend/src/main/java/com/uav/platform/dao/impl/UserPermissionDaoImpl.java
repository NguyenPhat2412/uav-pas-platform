package com.uav.platform.dao.impl;

import com.uav.platform.dao.IUserPermissionDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.UserPermission;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public class UserPermissionDaoImpl extends HibernateGenericDao<Long, UserPermission>
        implements IUserPermissionDao {

    private static final Logger logger = LoggerFactory.getLogger(UserPermissionDaoImpl.class);

    public UserPermissionDaoImpl(final EntityManager entityManager) {
        super(UserPermission.class, entityManager);
    }

    @Override
    public Optional<UserPermission> findByUserIdAndPermissionCode(
            Long userId, com.uav.platform.enums.PermissionCode code) {
        return hql("select e from UserPermission e where e.user.id = :userId and e.permission.code = :code")
                .setParameter("userId", userId)
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public List<UserPermission> findByUserId(Long userId) {
        return hql("select e from UserPermission e where e.user.id = :userId")
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    @Transactional
    public void deleteByUserIdAndPermissionCode(
            Long userId, com.uav.platform.enums.PermissionCode code) {
        hqlMutation(
                        "delete from UserPermission e where e.user.id = :userId and e.permission.code = :code")
                .setParameter("userId", userId)
                .setParameter("code", code)
                .executeUpdate();
    }

    @Override
    @Transactional
    public void deleteByUserId(Long userId) {
        hqlMutation("delete from UserPermission e where e.user.id = :userId")
                .setParameter("userId", userId)
                .executeUpdate();
    }
}
