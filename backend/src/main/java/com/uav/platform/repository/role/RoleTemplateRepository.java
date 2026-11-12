package com.uav.platform.repository.role;

import com.uav.platform.entity.role.RoleTemplate;
import com.uav.platform.enums.user.UserRole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface RoleTemplateRepository
        extends JpaRepository<RoleTemplate, Long>, JpaSpecificationExecutor<RoleTemplate> {
    Optional<RoleTemplate> findByRole(UserRole role);
}
