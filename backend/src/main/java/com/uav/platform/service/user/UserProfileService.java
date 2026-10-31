package com.uav.platform.service.user;

import com.uav.platform.dto.record.user.UserProfileUpdateCommand;
import com.uav.platform.dto.request.user.UserProfilePatchRequest;
import com.uav.platform.dto.response.user.UserProfileResponse;

public interface UserProfileService {
    UserProfileResponse get(String username);

    UserProfileResponse updatePayload(String username, UserProfilePatchRequest request);

    UserProfileResponse update(String username, UserProfileUpdateCommand request);
}
