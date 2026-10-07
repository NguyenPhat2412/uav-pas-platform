package com.uav.platform.modules.user.service;


import com.uav.platform.modules.user.config.response.UserResponse;
import com.uav.platform.modules.user.common.UserRole;
import com.uav.platform.modules.user.config.request.RoleUpdateRequest;
import com.uav.platform.common.dto.response.PageResponse;

/**
 * Service quản lý và truy vấn người dùng có hỗ trợ phân trang và sắp xếp.
 */
public interface UserService {

    PageResponse<UserResponse> getUsers(
            int page,
            int size,
            String sortBy,
            String direction,
            String keyword,
            UserRole role
    );

    UserResponse getUserById(Long id);

    void lockUser(Long id, String actor);
    void unlockUser(Long id, String actor);
    UserResponse updateRole(Long id, RoleUpdateRequest request, String actor);
}
