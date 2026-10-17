package com.uav.platform.modules.role.repository;

import com.uav.platform.modules.role.entity.RoleTemplate;
import com.uav.platform.modules.user.enums.UserRole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface RoleTemplateRepository
        extends JpaRepository<RoleTemplate, Long>, JpaSpecificationExecutor<RoleTemplate> {
    Optional<RoleTemplate> findByRole(UserRole role);
}
