package com.uav.platform.mapper.notification;

import com.uav.platform.dto.response.notification.NotificationResponse;
import com.uav.platform.entity.notification.Notification;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface NotificationMapper {

    @Mapping(target = "userId", source = "user.id")
    NotificationResponse toResponse(Notification n);
}
