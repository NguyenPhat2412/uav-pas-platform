package com.uav.platform.mapper.user;

import com.uav.platform.dto.response.user.UserResponse;
import com.uav.platform.entity.user.AppUser;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/** Maps the user aggregate to its public response contract. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserMapper {

    @Mapping(target = "role", defaultValue = "ROLE_PILOT")
    @Mapping(target = "locked", source = "manualLocked")
    @Mapping(target = "twoFactorMethod", defaultValue = "EMAIL")
    UserResponse toResponse(AppUser user);
}
