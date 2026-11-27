package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.RoleTemplate;
import com.uav.platform.enums.UserRole;

import java.util.Optional;

public interface IRoleTemplateDao extends IGenericDao<Long, RoleTemplate> {
    Optional<RoleTemplate> findByRole(UserRole role);
}
