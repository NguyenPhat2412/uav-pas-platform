package com.uav.platform.service.user.profile;

import com.uav.platform.dto.record.user.profile.UserProfileUpdateCommand;
import com.uav.platform.dto.request.user.account.AccountDeletionRequest;
import com.uav.platform.dto.request.user.profile.UserProfilePatchRequest;
import com.uav.platform.dto.response.user.account.AccountDeletionPolicyResponse;
import com.uav.platform.dto.response.user.profile.UserProfileResponse;

public interface UserProfileService {
    UserProfileResponse get(String username);

    UserProfileResponse updatePayload(String username, UserProfilePatchRequest request);

    UserProfileResponse update(String username, UserProfileUpdateCommand request);

    AccountDeletionPolicyResponse getDeletionPolicy(String username);

    void deleteOwnAccount(String username, AccountDeletionRequest request);
}
