package com.uav.platform.modules.permission.repository;

import com.uav.platform.modules.permission.entity.UserPermission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface UserPermissionRepository
        extends JpaRepository<UserPermission, Long>, JpaSpecificationExecutor<UserPermission> {
    Optional<UserPermission> findByUserIdAndPermissionCode(
            Long userId, com.uav.platform.modules.permission.enums.PermissionCode code);

    List<UserPermission> findByUserId(Long userId);

    void deleteByUserIdAndPermissionCode(
            Long userId, com.uav.platform.modules.permission.enums.PermissionCode code);
}
