package com.uav.platform.service.user;

import com.uav.platform.dto.request.user.AvatarUploadRequest;
import com.uav.platform.dto.response.media.SignedMediaUrlResponse;
import com.uav.platform.dto.response.user.AvatarResponse;

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
