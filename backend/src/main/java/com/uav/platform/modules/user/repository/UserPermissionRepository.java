package com.uav.platform.modules.user.repository;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.List;

public interface UserPermissionRepository extends JpaRepository<UserPermission, Long>, JpaSpecificationExecutor<UserPermission> {
    Optional<UserPermission> findByUserIdAndPermissionCode(Long userId, com.uav.platform.modules.user.common.PermissionCode code);
    List<UserPermission> findByUserId(Long userId);
    void deleteByUserIdAndPermissionCode(Long userId, com.uav.platform.modules.user.common.PermissionCode code);
}
