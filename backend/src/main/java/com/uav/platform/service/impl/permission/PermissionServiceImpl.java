package com.uav.platform.service.impl.permission;

import com.uav.platform.config.permission.PermissionDataInitializer;
import com.uav.platform.dto.response.permission.PermissionCodesResponse;
import com.uav.platform.dto.response.permission.PermissionResponse;
import com.uav.platform.dto.response.permission.UserPermissionResponse;
import com.uav.platform.entity.permission.Permission;
import com.uav.platform.entity.permission.UserPermission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.permission.PermissionMapper;
import com.uav.platform.repository.permission.PermissionRepository;
import com.uav.platform.repository.permission.UserPermissionRepository;
import com.uav.platform.repository.role.RoleTemplatePermissionRepository;
import com.uav.platform.repository.role.RoleTemplateRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.security.AccessRecoveryGuard;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.user.UserAccountServiceImpl;
import com.uav.platform.service.permission.PermissionService;

import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service("permissionService")
@Transactional
public class PermissionServiceImpl implements PermissionService {
    private final PermissionRepository permissions;
    private final UserPermissionRepository userPermissions;
    private final UserRepository users;
    private final AuditLogService auditLogService;
    private final RoleTemplateRepository roleTemplates;
    private final RoleTemplatePermissionRepository roleTemplatePermissions;
    private final AccessRecoveryGuard recovery;
    private final PermissionMapper permissionMapper;

    public PermissionServiceImpl(
            PermissionRepository permissions,
            UserPermissionRepository userPermissions,
            UserRepository users,
            AuditLogService auditLogService) {
        this(permissions, userPermissions, users, auditLogService, null, null);
    }

    public PermissionServiceImpl(
            PermissionRepository permissions,
            UserPermissionRepository userPermissions,
            UserRepository users,
            AuditLogService auditLogService,
            RoleTemplateRepository roleTemplates,
            RoleTemplatePermissionRepository roleTemplatePermissions) {
        this(
                permissions,
                userPermissions,
                users,
                auditLogService,
                roleTemplates,
                roleTemplatePermissions,
                null);
    }

    public PermissionServiceImpl(
            PermissionRepository permissions,
            UserPermissionRepository userPermissions,
            UserRepository users,
            AuditLogService auditLogService,
            RoleTemplateRepository roleTemplates,
            RoleTemplatePermissionRepository roleTemplatePermissions,
            AccessRecoveryGuard recovery) {
        this(
                permissions,
                userPermissions,
                users,
                auditLogService,
                roleTemplates,
                roleTemplatePermissions,
                recovery,
                Mappers.getMapper(PermissionMapper.class));
    }

    @Autowired
    public PermissionServiceImpl(
            PermissionRepository permissions,
            UserPermissionRepository userPermissions,
            UserRepository users,
            AuditLogService auditLogService,
            RoleTemplateRepository roleTemplates,
            RoleTemplatePermissionRepository roleTemplatePermissions,
            AccessRecoveryGuard recovery,
            PermissionMapper permissionMapper) {
        this.recovery = recovery;
        this.permissions = permissions;
        this.userPermissions = userPermissions;
        this.users = users;
        this.auditLogService = auditLogService;
        this.roleTemplates = roleTemplates;
        this.roleTemplatePermissions = roleTemplatePermissions;
        this.permissionMapper = permissionMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean has(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        PermissionCode code;
        try {
            code = PermissionCode.valueOf(permissionCode);
        } catch (IllegalArgumentException ex) {
            return false;
        }
        return users.findByUsername(authentication.getName())
                .filter(
                        user ->
                                UserAccountServiceImpl.isEnabled(user)
                                        && UserAccountServiceImpl.isAccountNonLocked(user))
                .map(
                        user ->
                                userPermissions
                                        .findByUserIdAndPermissionCode(user.getId(), code)
                                        .map(UserPermission::isGranted)
                                        .orElseGet(
                                                () ->
                                                        templatePermission(user.getRole(), code)
                                                                .orElse(
                                                                        PermissionDataInitializer
                                                                                .defaults(
                                                                                        user
                                                                                                .getRole())
                                                                                .contains(code))))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public PermissionCodesResponse current(Authentication authentication) {
        return new PermissionCodesResponse(
                Arrays.stream(PermissionCode.values())
                        .filter(code -> has(authentication, code.name()))
                        .map(Enum::name)
                        .toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> list() {
        return permissions.findAll().stream().map(permissionMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserPermissionResponse> listUserPermissions(Long userId) {
        if (!users.existsById(userId)) throw SystemException.notFound("User not found");
        return userPermissions.findByUserId(userId).stream()
                .map(permissionMapper::toResponse)
                .toList();
    }

    @Override
    public void removeUserPermission(Long userId, PermissionCode code, String actorUsername) {
        long before = recovery == null ? 0 : recovery.begin();
        if (!users.existsById(userId)) throw SystemException.notFound("User not found");
        userPermissions.deleteByUserIdAndPermissionCode(userId, code);
        if (recovery != null) recovery.finish(before);
        auditLogService.record(
                null,
                actorUsername,
                AuditAction.REVOKE,
                "USER_PERMISSION",
                userId.toString(),
                "RESET_TO_TEMPLATE:" + code.name());
    }

    @Override
    public void setUserPermission(
            Long userId, PermissionCode code, boolean granted, String actorUsername) {
        long before = recovery == null ? 0 : recovery.begin();
        AppUser user =
                users.findById(userId)
                        .orElseThrow(() -> SystemException.notFound("User not found"));
        Permission permission =
                permissions
                        .findByCode(code)
                        .orElseGet(() -> permissions.save(new Permission(code, code.name())));
        UserPermission assignment =
                userPermissions
                        .findByUserIdAndPermissionCode(userId, code)
                        .orElseGet(() -> new UserPermission(user, permission, granted));
        assignment.setGranted(granted);
        userPermissions.save(assignment);
        if (recovery != null) recovery.finish(before);
        auditLogService.record(
                null,
                actorUsername,
                granted ? AuditAction.GRANT : AuditAction.REVOKE,
                "USER_PERMISSION",
                userId.toString(),
                code.name());
    }

    private java.util.Optional<Boolean> templatePermission(UserRole role, PermissionCode code) {
        if (roleTemplates == null || roleTemplatePermissions == null)
            return java.util.Optional.empty();
        return roleTemplates
                .findByRole(role)
                .map(
                        template ->
                                roleTemplatePermissions
                                        .findByRoleTemplateIdAndPermissionCode(
                                                template.getId(), code)
                                        .isPresent());
    }
}
