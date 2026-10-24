package com.uav.platform.modules.user.service;

import com.uav.platform.modules.media.dto.response.SignedMediaUrlResponse;
import com.uav.platform.modules.user.dto.request.AvatarUploadRequest;
import com.uav.platform.modules.user.dto.response.AvatarResponse;

import org.springframework.security.core.Authentication;

public interface AvatarService {
    /** Registers an unlinked image owned by the caller and returns a signed upload URL for it. */
    SignedMediaUrlResponse uploadUrl(String username, AvatarUploadRequest request);

    /** Confirms the uploaded image and makes it the caller's avatar, retiring the previous one. */
    AvatarResponse use(String username, Long mediaId);

    void remove(String username);

    /** Short-lived storage URL for a user's avatar; visible to the user themselves and to USER_READ holders. */
    String signedUrl(Long userId, Authentication viewer);
}
