package com.uav.platform.repository.permission;

import com.uav.platform.entity.permission.Permission;
import com.uav.platform.enums.permission.PermissionCode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PermissionRepository
        extends JpaRepository<Permission, Long>, JpaSpecificationExecutor<Permission> {
    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "select p from Permission p where p.code = :code")
    Optional<Permission> findByCodeForUpdate(PermissionCode code);

    Optional<Permission> findByCode(PermissionCode code);
}
