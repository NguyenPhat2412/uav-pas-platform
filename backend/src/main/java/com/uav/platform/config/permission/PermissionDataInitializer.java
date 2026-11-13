package com.uav.platform.config.permission;

import com.uav.platform.entity.permission.Permission;
import com.uav.platform.entity.role.RoleTemplate;
import com.uav.platform.entity.role.RoleTemplatePermission;
import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.repository.permission.PermissionRepository;
import com.uav.platform.repository.role.RoleTemplatePermissionRepository;
import com.uav.platform.repository.role.RoleTemplateRepository;
import com.uav.platform.service.impl.role.RoleTemplateOperations;

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

    /** A role template's default permissions; also the fallback while a template is not initialised yet. */
    public static EnumSet<PermissionCode> defaults(UserRole role) {
        if (role == UserRole.ROLE_ADMIN) return EnumSet.allOf(PermissionCode.class);
        if (role == UserRole.ROLE_COMMANDER)
            return EnumSet.of(
                    PermissionCode.SUPPORT_MANAGE,
                    PermissionCode.USER_VIEW,
                    PermissionCode.STATION_VIEW,
                    PermissionCode.UAV_VIEW,
                    PermissionCode.UAV_CREATE,
                    PermissionCode.UAV_UPDATE,
                    PermissionCode.UAV_STATUS_UPDATE,
                    PermissionCode.UAV_MAINTENANCE_VIEW,
                    PermissionCode.UAV_MAINTENANCE_CREATE,
                    PermissionCode.UAV_MAINTENANCE_UPDATE,
                    PermissionCode.INVENTORY_VIEW,
                    PermissionCode.MEDIA_VIEW,
                    PermissionCode.MEDIA_UPLOAD,
                    PermissionCode.MEDIA_DOWNLOAD,
                    PermissionCode.MEDIA_DELETE,
                    PermissionCode.DASHBOARD_VIEW,
                    PermissionCode.DASHBOARD_USER,
                    PermissionCode.DASHBOARD_UAV,
                    PermissionCode.DASHBOARD_STATION,
                    PermissionCode.DASHBOARD_INVENTORY,
                    PermissionCode.DASHBOARD_MISSION,
                    PermissionCode.AUDIT_VIEW,
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
                    PermissionCode.SUPPORT_MANAGE,
                    PermissionCode.STATION_VIEW,
                    PermissionCode.UAV_VIEW,
                    PermissionCode.INVENTORY_VIEW,
                    PermissionCode.INVENTORY_ITEM_CREATE,
                    PermissionCode.INVENTORY_ITEM_UPDATE,
                    PermissionCode.INVENTORY_STOCK_IN,
                    PermissionCode.INVENTORY_STOCK_OUT,
                    PermissionCode.INVENTORY_RESERVE,
                    PermissionCode.INVENTORY_RELEASE,
                    PermissionCode.INVENTORY_TRANSFER,
                    PermissionCode.INVENTORY_HISTORY_VIEW,
                    PermissionCode.MEDIA_VIEW,
                    PermissionCode.MEDIA_UPLOAD,
                    PermissionCode.MEDIA_DOWNLOAD,
                    PermissionCode.MEDIA_DELETE,
                    PermissionCode.DASHBOARD_VIEW,
                    PermissionCode.DASHBOARD_UAV,
                    PermissionCode.DASHBOARD_STATION,
                    PermissionCode.DASHBOARD_INVENTORY,
                    PermissionCode.MISSION_VIEW,
                    PermissionCode.MISSION_START,
                    PermissionCode.MISSION_COMPLETE,
                    PermissionCode.MISSION_STATUS_UPDATE,
                    PermissionCode.MISSION_MEDIA_VIEW,
                    PermissionCode.MISSION_MEDIA_UPLOAD,
                    PermissionCode.MISSION_TIMELINE_VIEW);
        return EnumSet.of(
                PermissionCode.STATION_VIEW,
                PermissionCode.UAV_VIEW,
                PermissionCode.MEDIA_VIEW,
                PermissionCode.MEDIA_DOWNLOAD,
                PermissionCode.DASHBOARD_VIEW,
                PermissionCode.DASHBOARD_STATION,
                PermissionCode.DASHBOARD_UAV,
                PermissionCode.MISSION_VIEW,
                PermissionCode.MISSION_CREATE,
                PermissionCode.MISSION_UPDATE,
                PermissionCode.MISSION_CANCEL,
                PermissionCode.MISSION_MEDIA_VIEW,
                PermissionCode.MISSION_MEDIA_UPLOAD,
                PermissionCode.MISSION_TIMELINE_VIEW);
    }
}
