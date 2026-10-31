package com.uav.platform.mapper.audit;

import com.uav.platform.dto.response.audit.AuditLogResponse;
import com.uav.platform.entity.audit.AuditLog;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AuditLogMapper {

    AuditLogResponse toResponse(AuditLog log);
}
