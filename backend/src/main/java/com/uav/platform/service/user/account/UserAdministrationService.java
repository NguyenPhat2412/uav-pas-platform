package com.uav.platform.service.user.account;

import com.uav.platform.dto.request.user.account.AdminCreateUserRequest;
import com.uav.platform.dto.request.user.account.BulkLockRequest;
import com.uav.platform.dto.request.user.account.PasswordResetRequest;
import com.uav.platform.dto.response.user.account.BulkActionResponse;
import com.uav.platform.dto.response.user.account.UserResponse;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;

/** Administrator-only account operations: provisioning, credential resets, bulk access changes and export. */
public interface UserAdministrationService {
    UserResponse create(AdminCreateUserRequest request, String actor);

    void resetPassword(Long id, PasswordResetRequest request, String actor);

    BulkActionResponse bulkLock(BulkLockRequest request, String actor);

    String exportCsv(String keyword, UserRole role, UserStatus status);
}
