package com.uav.platform.modules.role.service.impl;

import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.permission.entity.Permission;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.permission.repository.PermissionRepository;
import com.uav.platform.modules.role.dto.response.RoleTemplateResponse;
import com.uav.platform.modules.role.entity.RoleTemplate;
import com.uav.platform.modules.role.entity.RoleTemplatePermission;
import com.uav.platform.modules.role.mapper.RoleTemplateMapper;
import com.uav.platform.modules.role.repository.RoleTemplatePermissionRepository;
import com.uav.platform.modules.role.repository.RoleTemplateRepository;
import com.uav.platform.modules.role.service.RoleTemplateService;
import com.uav.platform.modules.user.enums.UserRole;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;

@Service
@Transactional
public class RoleTemplateServiceImpl implements RoleTemplateService {
    private final RoleTemplateRepository templates;
    private final RoleTemplatePermissionRepository assignments;
    private final PermissionRepository permissions;
    private final AuditLogService audit;
    private final com.uav.platform.security.AccessRecoveryGuard recovery;

    public RoleTemplateServiceImpl(
            RoleTemplateRepository templates,
            RoleTemplatePermissionRepository assignments,
            PermissionRepository permissions,
            AuditLogService audit) {
        this(templates, assignments, permissions, audit, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public RoleTemplateServiceImpl(
            RoleTemplateRepository templates,
            RoleTemplatePermissionRepository assignments,
            PermissionRepository permissions,
            AuditLogService audit,
            com.uav.platform.security.AccessRecoveryGuard recovery) {
        this.recovery = recovery;
        this.templates = templates;
        this.assignments = assignments;
        this.permissions = permissions;
        this.audit = audit;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleTemplateResponse> list() {
        return templates.findAll().stream()
                .map(
                        t ->
                                RoleTemplateMapper.toResponse(
                                        t,
                                        assignments.findByRoleTemplateId(t.getId()).stream()
                                                .map(a -> a.getPermission().getCode())
                                                .collect(
                                                        java.util.stream.Collectors.toCollection(
                                                                () ->
                                                                        EnumSet.noneOf(
                                                                                PermissionCode
                                                                                        .class)))))
                .toList();
    }

    @Override
    public void setPermission(UserRole role, PermissionCode code, boolean granted, String actor) {
        long before = recovery == null ? 0 : recovery.begin();
        RoleTemplate template =
                templates
                        .findByRole(role)
                        .orElseGet(() -> templates.save(new RoleTemplate(role, role.name())));
        Permission permission =
                permissions
                        .findByCode(code)
                        .orElseGet(() -> permissions.save(new Permission(code, code.name())));
        assignments
                .findByRoleTemplateIdAndPermissionCode(template.getId(), code)
                .ifPresentOrElse(
                        existing -> {
                            if (!granted) assignments.delete(existing);
                        },
                        () -> {
                            if (granted)
                                assignments.save(new RoleTemplatePermission(template, permission));
                        });
        if (recovery != null) recovery.finish(before);
        audit.record(
                null,
                actor,
                granted ? AuditAction.GRANT : AuditAction.REVOKE,
                "ROLE_TEMPLATE",
                role.name(),
                code.name());
    }
}
