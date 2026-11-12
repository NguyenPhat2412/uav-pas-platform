package com.uav.platform.mapper.auth;

import com.uav.platform.dto.response.auth.AuthResponse;
import com.uav.platform.dto.response.user.UserResponse;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/** Central mapping boundary for authentication responses. */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface AuthMapper {

    @Mapping(target = "tokenType", constant = "Bearer")
    @Mapping(target = "mfaRequired", constant = "false")
    @Mapping(target = "mfaMethod", ignore = true)
    @Mapping(target = "challengeToken", ignore = true)
    @Mapping(target = "maskedEmail", ignore = true)
    @Mapping(target = "devOtpPreview", ignore = true)
    AuthResponse toResponse(String accessToken, String refreshToken, UserResponse user);
}
