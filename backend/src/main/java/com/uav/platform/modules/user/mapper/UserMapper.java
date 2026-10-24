package com.uav.platform.modules.user.mapper;

import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/** Maps the user aggregate to its public response contract. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserMapper {

    @Mapping(target = "role", defaultValue = "ROLE_PILOT")
    @Mapping(target = "locked", source = "manualLocked")
    UserResponse toResponse(AppUser user);
}
