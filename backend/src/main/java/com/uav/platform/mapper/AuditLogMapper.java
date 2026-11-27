package com.uav.platform.mapper;

import com.uav.platform.dto.response.AuditLogResponse;
import com.uav.platform.entity.AuditLog;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AuditLogMapper {

    AuditLogResponse toResponse(AuditLog log);
}
