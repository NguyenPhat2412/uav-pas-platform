package com.uav.platform.modules.audit.mapper;

import com.uav.platform.modules.audit.dto.response.AuditLogResponse;
import com.uav.platform.modules.audit.entity.AuditLog;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AuditLogMapper {

    AuditLogResponse toResponse(AuditLog log);
}
