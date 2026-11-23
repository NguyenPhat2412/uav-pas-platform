package com.uav.platform.dao.impl.role;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.role.IRoleTemplatePermissionDao;
import com.uav.platform.entity.role.RoleTemplatePermission;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class RoleTemplatePermissionDaoImpl extends HibernateGenericDao<Long, RoleTemplatePermission>
        implements IRoleTemplatePermissionDao {

    private static final Logger logger =
            LoggerFactory.getLogger(RoleTemplatePermissionDaoImpl.class);

    public RoleTemplatePermissionDaoImpl(final EntityManager entityManager) {
        super(RoleTemplatePermission.class, entityManager);
    }

    @Override
    public Optional<RoleTemplatePermission> findByRoleTemplateIdAndPermissionCode(
            Long roleTemplateId, com.uav.platform.enums.permission.PermissionCode code) {
        return hql("select e from RoleTemplatePermission e where e.roleTemplate.id = :roleTemplateId and e.permission.code = :code")
                .setParameter("roleTemplateId", roleTemplateId)
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public List<RoleTemplatePermission> findByRoleTemplateId(Long roleTemplateId) {
        return hql("select e from RoleTemplatePermission e where e.roleTemplate.id = :roleTemplateId")
                .setParameter("roleTemplateId", roleTemplateId)
                .getResultList();
    }
}
