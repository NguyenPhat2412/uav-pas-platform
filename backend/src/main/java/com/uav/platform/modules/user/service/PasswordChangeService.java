package com.uav.platform.modules.user.service;

import com.uav.platform.modules.user.dto.request.PasswordChangeRequest;

/** Self-service password change: the caller must prove the current password. */
public interface PasswordChangeService {
    void change(String username, PasswordChangeRequest request);
}
