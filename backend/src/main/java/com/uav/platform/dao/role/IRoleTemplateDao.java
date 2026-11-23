package com.uav.platform.dao.role;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.role.RoleTemplate;
import com.uav.platform.enums.user.UserRole;

import java.util.Optional;

public interface IRoleTemplateDao extends IGenericDao<Long, RoleTemplate> {
    Optional<RoleTemplate> findByRole(UserRole role);
}
