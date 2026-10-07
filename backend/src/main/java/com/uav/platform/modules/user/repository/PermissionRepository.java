package com.uav.platform.modules.user.repository;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.Permission;
import com.uav.platform.modules.user.common.PermissionCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long>, JpaSpecificationExecutor<Permission> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Permission p where p.code = :code")
    Optional<Permission> findByCodeForUpdate(PermissionCode code);
    Optional<Permission> findByCode(PermissionCode code);
}
