package com.uav.platform.modules.user.service;

import com.uav.platform.modules.user.dto.record.UserProfileUpdateCommand;
import com.uav.platform.modules.user.dto.request.UserProfilePatchRequest;
import com.uav.platform.modules.user.dto.response.UserProfileResponse;

public interface UserProfileService {
    UserProfileResponse get(String username);

    UserProfileResponse updatePayload(String username, UserProfilePatchRequest request);

    UserProfileResponse update(String username, UserProfileUpdateCommand request);
}
