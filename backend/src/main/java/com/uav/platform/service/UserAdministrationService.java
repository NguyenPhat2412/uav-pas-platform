package com.uav.platform.service;

import com.uav.platform.dto.request.AdminCreateUserRequest;
import com.uav.platform.dto.request.BulkLockRequest;
import com.uav.platform.dto.request.PasswordResetRequest;
import com.uav.platform.dto.response.BulkActionResponse;
import com.uav.platform.dto.response.UserResponse;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;

/** Administrator-only account operations: provisioning, credential resets, bulk access changes and export. */
public interface UserAdministrationService {
    UserResponse create(AdminCreateUserRequest request, String actor);

    void resetPassword(Long id, PasswordResetRequest request, String actor);

    BulkActionResponse bulkLock(BulkLockRequest request, String actor);

    String exportCsv(String keyword, UserRole role, UserStatus status);
}
