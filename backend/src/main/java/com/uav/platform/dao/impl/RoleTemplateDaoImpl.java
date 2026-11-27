package com.uav.platform.dao.impl;

import com.uav.platform.dao.IRoleTemplateDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.RoleTemplate;
import com.uav.platform.enums.UserRole;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class RoleTemplateDaoImpl extends HibernateGenericDao<Long, RoleTemplate>
        implements IRoleTemplateDao {

    private static final Logger logger = LoggerFactory.getLogger(RoleTemplateDaoImpl.class);

    public RoleTemplateDaoImpl(final EntityManager entityManager) {
        super(RoleTemplate.class, entityManager);
    }

    @Override
    public Optional<RoleTemplate> findByRole(UserRole role) {
        return hql("select e from RoleTemplate e where e.role = :role")
                .setParameter("role", role)
                .uniqueResultOptional();
    }
}
