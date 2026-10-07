package com.uav.platform.modules.user.service.impl;

import com.uav.platform.modules.user.mapper.PermissionMapper;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.config.response.PermissionResponse;
import com.uav.platform.modules.user.entity.*;
import com.uav.platform.modules.user.repository.PermissionRepository;
import com.uav.platform.modules.user.repository.UserPermissionRepository;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.repository.RoleTemplateRepository;
import com.uav.platform.modules.user.repository.RoleTemplatePermissionRepository;
import com.uav.platform.modules.user.service.PermissionService;
import com.uav.platform.error.SystemException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;

@Service("permissionService")
@Transactional
public class IPermissionService implements PermissionService {
    private final PermissionRepository permissions;
    private final UserPermissionRepository userPermissions;
    private final UserRepository users;
    private final AuditLogService auditLogService;
    private final RoleTemplateRepository roleTemplates;
    private final RoleTemplatePermissionRepository roleTemplatePermissions;
    private final com.uav.platform.security.AccessRecoveryGuard recovery;

    public IPermissionService(PermissionRepository permissions, UserPermissionRepository userPermissions,
                                 UserRepository users, AuditLogService auditLogService) {
        this(permissions, userPermissions, users, auditLogService, null, null);
    }

    public IPermissionService(PermissionRepository permissions, UserPermissionRepository userPermissions,
                                 UserRepository users, AuditLogService auditLogService,
                                 RoleTemplateRepository roleTemplates, RoleTemplatePermissionRepository roleTemplatePermissions) {
        this(permissions, userPermissions, users, auditLogService, roleTemplates, roleTemplatePermissions, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public IPermissionService(PermissionRepository permissions, UserPermissionRepository userPermissions, UserRepository users,
                                 AuditLogService auditLogService, RoleTemplateRepository roleTemplates,
                                 RoleTemplatePermissionRepository roleTemplatePermissions, com.uav.platform.security.AccessRecoveryGuard recovery) {
        this.recovery = recovery;
        this.permissions = permissions;
        this.userPermissions = userPermissions;
        this.users = users;
        this.auditLogService = auditLogService;
        this.roleTemplates = roleTemplates;
        this.roleTemplatePermissions = roleTemplatePermissions;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean has(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        PermissionCode code;
        try { code = PermissionCode.valueOf(permissionCode); } catch (IllegalArgumentException ex) { return false; }
        return users.findByUsername(authentication.getName())
                .filter(user -> user.isEnabled() && user.isAccountNonLocked())
                .map(user -> userPermissions.findByUserIdAndPermissionCode(user.getId(), code)
                        .map(UserPermission::isGranted)
                        .orElseGet(() -> templatePermission(user.getRole(), code)
                                .orElse(defaultPermissions(user.getRole()).contains(code))))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> list() {
        return permissions.findAll().stream().map(PermissionMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.uav.platform.modules.user.config.response.UserPermissionResponse> listUserPermissions(Long userId) {
        if (!users.existsById(userId)) throw com.uav.platform.error.SystemException.notFound("User not found");
        return userPermissions.findByUserId(userId).stream()
                .map(PermissionMapper::toResponse).toList();
    }

    @Override
    public void removeUserPermission(Long userId, PermissionCode code, String actorUsername) {
        long before=recovery==null?0:recovery.begin();
        if (!users.existsById(userId)) throw com.uav.platform.error.SystemException.notFound("User not found");
        userPermissions.deleteByUserIdAndPermissionCode(userId, code);
        if(recovery!=null) recovery.finish(before);
        auditLogService.record(null, actorUsername, AuditAction.REVOKE, "USER_PERMISSION", userId.toString(), "RESET_TO_TEMPLATE:" + code.name());
    }

    @Override
    public void setUserPermission(Long userId, PermissionCode code, boolean granted, String actorUsername) {
        long before=recovery==null?0:recovery.begin();
        AppUser user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        Permission permission = permissions.findByCode(code).orElseGet(() -> permissions.save(new Permission(code, code.name())));
        UserPermission assignment = userPermissions.findByUserIdAndPermissionCode(userId, code)
                .orElseGet(() -> new UserPermission(user, permission, granted));
        assignment.setGranted(granted);
        userPermissions.save(assignment);
        if(recovery!=null) recovery.finish(before);
        auditLogService.record(null, actorUsername, granted ? AuditAction.GRANT : AuditAction.REVOKE,
                "USER_PERMISSION", userId.toString(), code.name());
    }

    private EnumSet<PermissionCode> defaultPermissions(UserRole role) {
        if (role == UserRole.ROLE_ADMIN) return EnumSet.allOf(PermissionCode.class);
        if (role == UserRole.ROLE_COMMANDER) return EnumSet.of(PermissionCode.USER_READ, PermissionCode.STATION_READ,
                PermissionCode.UAV_READ, PermissionCode.UAV_MANAGE, PermissionCode.INVENTORY_READ,
                PermissionCode.MEDIA_READ, PermissionCode.MEDIA_MANAGE, PermissionCode.DASHBOARD_READ,
                PermissionCode.DASHBOARD_MISSION, PermissionCode.AUDIT_READ, PermissionCode.MISSION_VIEW_ALL,
                PermissionCode.MISSION_CONFIRM, PermissionCode.MISSION_REJECT, PermissionCode.MISSION_RESERVE_EQUIPMENT,
                PermissionCode.MISSION_ASSIGN_STATION, PermissionCode.MISSION_ASSIGN_UAV,
                PermissionCode.MISSION_ASSIGN_OPERATOR, PermissionCode.MISSION_STATUS_UPDATE, PermissionCode.MISSION_TIMELINE_VIEW);
        if (role == UserRole.ROLE_OPERATOR) return EnumSet.of(PermissionCode.STATION_READ, PermissionCode.UAV_READ,
                PermissionCode.INVENTORY_READ, PermissionCode.INVENTORY_MANAGE, PermissionCode.MEDIA_READ,
                PermissionCode.MEDIA_MANAGE, PermissionCode.DASHBOARD_READ, PermissionCode.MISSION_VIEW,
                PermissionCode.MISSION_START, PermissionCode.MISSION_COMPLETE, PermissionCode.MISSION_STATUS_UPDATE,
                PermissionCode.MISSION_MEDIA_VIEW, PermissionCode.MISSION_MEDIA_UPLOAD, PermissionCode.MISSION_TIMELINE_VIEW);
        return EnumSet.of(PermissionCode.STATION_READ, PermissionCode.UAV_READ, PermissionCode.MEDIA_READ,
                PermissionCode.DASHBOARD_READ, PermissionCode.MISSION_VIEW, PermissionCode.MISSION_CREATE,
                PermissionCode.MISSION_UPDATE, PermissionCode.MISSION_CANCEL, PermissionCode.MISSION_MEDIA_VIEW,
                PermissionCode.MISSION_MEDIA_UPLOAD, PermissionCode.MISSION_TIMELINE_VIEW);
    }

    private java.util.Optional<Boolean> templatePermission(UserRole role, PermissionCode code) {
        if (roleTemplates == null || roleTemplatePermissions == null) return java.util.Optional.empty();
        return roleTemplates.findByRole(role).map(template -> roleTemplatePermissions
                .findByRoleTemplateIdAndPermissionCode(template.getId(), code).isPresent());
    }
}
