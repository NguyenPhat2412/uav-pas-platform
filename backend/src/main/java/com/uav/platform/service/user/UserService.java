package com.uav.platform.service.user;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.user.RoleUpdateRequest;
import com.uav.platform.dto.request.user.UserQueryRequest;
import com.uav.platform.dto.response.user.UserResponse;

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
