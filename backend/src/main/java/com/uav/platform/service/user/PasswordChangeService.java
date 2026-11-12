package com.uav.platform.service.user;

import com.uav.platform.dto.request.user.PasswordChangeRequest;

/** Self-service password change: the caller must prove the current password. */
public interface PasswordChangeService {
    void change(String username, PasswordChangeRequest request);
}
