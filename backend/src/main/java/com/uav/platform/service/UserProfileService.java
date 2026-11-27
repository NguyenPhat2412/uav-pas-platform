package com.uav.platform.service;

import com.uav.platform.dto.record.UserProfileUpdateCommand;
import com.uav.platform.dto.request.AccountDeletionRequest;
import com.uav.platform.dto.request.UserProfilePatchRequest;
import com.uav.platform.dto.response.AccountDeletionPolicyResponse;
import com.uav.platform.dto.response.UserProfileResponse;

public interface UserProfileService {
    UserProfileResponse get(String username);

    UserProfileResponse updatePayload(String username, UserProfilePatchRequest request);

    UserProfileResponse update(String username, UserProfileUpdateCommand request);

    AccountDeletionPolicyResponse getDeletionPolicy(String username);

    void deleteOwnAccount(String username, AccountDeletionRequest request);
}
