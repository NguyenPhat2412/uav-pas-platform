package com.uav.platform.modules.user.controller;

import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.role.dto.request.RoleUpdateRequest;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(RestEndpoint.USERS)
@Tag(name = "Users", description = "User management, pagination, sorting, and query endpoints")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Get paginated, sorted, and filtered list of users")
    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_READ')")
    public ResponseEntity<PageResponse<UserResponse>> getUsers(
            @Parameter(description = "Page number (0-based index)", example = "0")
                    @RequestParam(defaultValue = "0")
                    int page,
            @Parameter(description = "Page size (number of items per page)", example = "10")
                    @RequestParam(defaultValue = "10")
                    int size,
            @Parameter(description = "Field name to sort by", example = "createdAt")
                    @RequestParam(defaultValue = "createdAt")
                    String sortBy,
            @Parameter(description = "Sort direction ('asc' or 'desc')", example = "desc")
                    @RequestParam(defaultValue = "desc")
                    String direction,
            @Parameter(
                            description = "Keyword to search across username, email, or fullName",
                            example = "pilot")
                    @RequestParam(required = false)
                    String keyword,
            @Parameter(description = "Filter by specific user role") @RequestParam(required = false)
                    UserRole role) {
        PageResponse<UserResponse> response =
                userService.getUsers(page, size, sortBy, direction, keyword, role);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get user details by ID")
    @GetMapping(RestEndpoint.USER_ID)
    @PreAuthorize("@permissionService.has(authentication, 'USER_READ')")
    public ResponseEntity<UserResponse> getUserById(
            @Parameter(description = "User unique ID", example = "1") @PathVariable Long id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping(RestEndpoint.USER_ID + "/lock")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> lock(@PathVariable Long id, Authentication authentication) {
        userService.lockUser(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(RestEndpoint.USER_ID + "/unlock")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> unlock(@PathVariable Long id, Authentication authentication) {
        userService.unlockUser(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PutMapping(RestEndpoint.USER_ID + "/role")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleUpdateRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(userService.updateRole(id, request, authentication.getName()));
    }
}
