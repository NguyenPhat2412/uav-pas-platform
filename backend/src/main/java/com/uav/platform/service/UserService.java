package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.RoleUpdateRequest;
import com.uav.platform.dto.request.UserQueryRequest;
import com.uav.platform.dto.response.UserResponse;

/**
 * Service quản lý và truy vấn người dùng có hỗ trợ phân trang và sắp xếp.
 */
public interface UserService {

    PageResponse<UserResponse> getUsers(UserQueryRequest request);

    UserResponse getUserById(Long id);

    void lockUser(Long id, String actor);

    void unlockUser(Long id, String actor);

    UserResponse updateRole(Long id, RoleUpdateRequest request, String actor);
}
