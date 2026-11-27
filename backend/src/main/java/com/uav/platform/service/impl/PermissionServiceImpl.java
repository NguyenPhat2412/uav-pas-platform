package com.uav.platform.service.impl;

import com.uav.platform.config.PermissionDataInitializer;
import com.uav.platform.dao.IPermissionDao;
import com.uav.platform.dao.IRoleTemplateDao;
import com.uav.platform.dao.IRoleTemplatePermissionDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IUserPermissionDao;
import com.uav.platform.dto.response.PermissionCodesResponse;
import com.uav.platform.dto.response.PermissionResponse;
import com.uav.platform.dto.response.UserPermissionResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Permission;
import com.uav.platform.entity.UserPermission;
import com.uav.platform.enums.AuditAction;
import com.uav.platform.enums.PermissionCode;
import com.uav.platform.enums.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.PermissionMapper;
import com.uav.platform.security.AccessRecoveryGuard;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.PermissionService;

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
    private final IPermissionDao permissions;
    private final IUserPermissionDao userPermissions;
    private final IUserDao users;
    private final AuditLogService auditLogService;
    private final IRoleTemplateDao roleTemplates;
    private final IRoleTemplatePermissionDao roleTemplatePermissions;
    private final AccessRecoveryGuard recovery;
    private final PermissionMapper permissionMapper;

    public PermissionServiceImpl(
            IPermissionDao permissions,
            IUserPermissionDao userPermissions,
            IUserDao users,
            AuditLogService auditLogService) {
        this(permissions, userPermissions, users, auditLogService, null, null);
    }

    public PermissionServiceImpl(
            IPermissionDao permissions,
            IUserPermissionDao userPermissions,
            IUserDao users,
            AuditLogService auditLogService,
            IRoleTemplateDao roleTemplates,
            IRoleTemplatePermissionDao roleTemplatePermissions) {
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
            IPermissionDao permissions,
            IUserPermissionDao userPermissions,
            IUserDao users,
            AuditLogService auditLogService,
            IRoleTemplateDao roleTemplates,
            IRoleTemplatePermissionDao roleTemplatePermissions,
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
            IPermissionDao permissions,
            IUserPermissionDao userPermissions,
            IUserDao users,
            AuditLogService auditLogService,
            IRoleTemplateDao roleTemplates,
            IRoleTemplatePermissionDao roleTemplatePermissions,
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
