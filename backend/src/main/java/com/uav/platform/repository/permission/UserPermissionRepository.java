package com.uav.platform.repository.permission;

import com.uav.platform.entity.permission.UserPermission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface UserPermissionRepository
        extends JpaRepository<UserPermission, Long>, JpaSpecificationExecutor<UserPermission> {
    Optional<UserPermission> findByUserIdAndPermissionCode(
            Long userId, com.uav.platform.enums.permission.PermissionCode code);

    List<UserPermission> findByUserId(Long userId);

    void deleteByUserIdAndPermissionCode(
            Long userId, com.uav.platform.enums.permission.PermissionCode code);
}
