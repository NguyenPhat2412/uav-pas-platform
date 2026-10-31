package com.uav.platform.service.user;

import com.uav.platform.dto.request.user.AdminCreateUserRequest;
import com.uav.platform.dto.request.user.BulkLockRequest;
import com.uav.platform.dto.request.user.PasswordResetRequest;
import com.uav.platform.dto.response.user.BulkActionResponse;
import com.uav.platform.dto.response.user.UserResponse;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;

/** Administrator-only account operations: provisioning, credential resets, bulk access changes and export. */
public interface UserAdministrationService {
    UserResponse create(AdminCreateUserRequest request, String actor);

    void resetPassword(Long id, PasswordResetRequest request, String actor);

    BulkActionResponse bulkLock(BulkLockRequest request, String actor);

    String exportCsv(String keyword, UserRole role, UserStatus status);
}
