package com.uav.platform.modules.audit.repository;

import com.uav.platform.modules.audit.entity.AuditLog;
import com.uav.platform.modules.audit.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository
        extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {}
