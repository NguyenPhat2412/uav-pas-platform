package com.uav.platform.modules.user.repository;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.RoleTemplate;
import com.uav.platform.modules.user.common.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface RoleTemplateRepository extends JpaRepository<RoleTemplate, Long>, JpaSpecificationExecutor<RoleTemplate> {
    Optional<RoleTemplate> findByRole(UserRole role);
}
