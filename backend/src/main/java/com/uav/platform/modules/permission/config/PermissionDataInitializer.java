package com.uav.platform.modules.permission.config;

import com.uav.platform.modules.permission.entity.Permission;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.permission.repository.PermissionRepository;
import com.uav.platform.modules.role.entity.RoleTemplate;
import com.uav.platform.modules.role.entity.RoleTemplatePermission;
import com.uav.platform.modules.role.repository.RoleTemplatePermissionRepository;
import com.uav.platform.modules.role.repository.RoleTemplateRepository;
import com.uav.platform.modules.role.service.impl.RoleTemplateOperations;
import com.uav.platform.modules.user.enums.UserRole;

import lombok.RequiredArgsConstructor;

import org.jspecify.annotations.NonNull;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;

@Component
@Order(1)
@RequiredArgsConstructor
public class PermissionDataInitializer implements ApplicationRunner {
    private final PermissionRepository repository;
    private final RoleTemplateRepository roleTemplates;
    private final RoleTemplatePermissionRepository templatePermissions;

    @Override
    @Transactional
    public void run(@NonNull ApplicationArguments args) {
        for (PermissionCode code : PermissionCode.values()) {
            if (repository.findByCode(code).isEmpty())
                repository.save(new Permission(code, code.name()));
        }
        for (UserRole role : UserRole.values()) {
            RoleTemplate template =
                    roleTemplates
                            .findByRole(role)
                            .orElseGet(
                                    () -> roleTemplates.save(new RoleTemplate(role, role.name())));
            if (!template.isDefaultsInitialized()) {
                for (PermissionCode code : defaults(role)) {
                    if (templatePermissions
                            .findByRoleTemplateIdAndPermissionCode(template.getId(), code)
                            .isEmpty()) {
                        templatePermissions.save(
                                new RoleTemplatePermission(
                                        template, repository.findByCode(code).orElseThrow()));
                    }
                }
                RoleTemplateOperations.initializeDefaults(template);
            }
        }
    }

    private EnumSet<PermissionCode> defaults(UserRole role) {
        if (role == UserRole.ROLE_ADMIN) return EnumSet.allOf(PermissionCode.class);
        if (role == UserRole.ROLE_COMMANDER)
            return EnumSet.of(
                    PermissionCode.USER_READ,
                    PermissionCode.STATION_READ,
                    PermissionCode.UAV_READ,
                    PermissionCode.UAV_MANAGE,
                    PermissionCode.INVENTORY_READ,
                    PermissionCode.MEDIA_READ,
                    PermissionCode.MEDIA_MANAGE,
                    PermissionCode.DASHBOARD_READ,
                    PermissionCode.DASHBOARD_MISSION,
                    PermissionCode.AUDIT_READ,
                    PermissionCode.MISSION_VIEW,
                    PermissionCode.MISSION_VIEW_ALL,
                    PermissionCode.MISSION_CONFIRM,
                    PermissionCode.MISSION_REJECT,
                    PermissionCode.MISSION_CANCEL,
                    PermissionCode.MISSION_RESERVE_EQUIPMENT,
                    PermissionCode.MISSION_ASSIGN_STATION,
                    PermissionCode.MISSION_ASSIGN_UAV,
                    PermissionCode.MISSION_ASSIGN_OPERATOR,
                    PermissionCode.MISSION_STATUS_UPDATE,
                    PermissionCode.MISSION_TIMELINE_VIEW);
        if (role == UserRole.ROLE_OPERATOR)
            return EnumSet.of(
                    PermissionCode.STATION_READ,
                    PermissionCode.UAV_READ,
                    PermissionCode.INVENTORY_READ,
                    PermissionCode.INVENTORY_MANAGE,
                    PermissionCode.MEDIA_READ,
                    PermissionCode.MEDIA_MANAGE,
                    PermissionCode.DASHBOARD_READ,
                    PermissionCode.MISSION_VIEW,
                    PermissionCode.MISSION_START,
                    PermissionCode.MISSION_COMPLETE,
                    PermissionCode.MISSION_STATUS_UPDATE,
                    PermissionCode.MISSION_MEDIA_VIEW,
                    PermissionCode.MISSION_MEDIA_UPLOAD,
                    PermissionCode.MISSION_TIMELINE_VIEW);
        return EnumSet.of(
                PermissionCode.STATION_READ,
                PermissionCode.UAV_READ,
                PermissionCode.MEDIA_READ,
                PermissionCode.DASHBOARD_READ,
                PermissionCode.MISSION_VIEW,
                PermissionCode.MISSION_CREATE,
                PermissionCode.MISSION_UPDATE,
                PermissionCode.MISSION_CANCEL,
                PermissionCode.MISSION_MEDIA_VIEW,
                PermissionCode.MISSION_MEDIA_UPLOAD,
                PermissionCode.MISSION_TIMELINE_VIEW);
    }
}
