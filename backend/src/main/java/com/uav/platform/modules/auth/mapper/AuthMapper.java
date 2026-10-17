package com.uav.platform.modules.auth.mapper;

import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.user.dto.response.UserResponse;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/** Central mapping boundary for authentication responses. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AuthMapper {

    @Mapping(target = "tokenType", constant = "Bearer")
    AuthResponse toResponse(String accessToken, String refreshToken, UserResponse user);
}
