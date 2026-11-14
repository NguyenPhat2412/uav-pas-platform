package com.uav.platform.mapper.user;

import static com.uav.platform.common.constant.SecurityConstants.DEFAULT_ROLE;

import com.uav.platform.dto.response.user.UserResponse;
import com.uav.platform.entity.user.AppUser;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/** Maps the user aggregate to its public response contract. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserMapper {

    @Mapping(target = "role", defaultValue = DEFAULT_ROLE)
    @Mapping(target = "locked", source = "manualLocked")
    @Mapping(target = "twoFactorMethod", defaultValue = "EMAIL")
    UserResponse toResponse(AppUser user);
}
