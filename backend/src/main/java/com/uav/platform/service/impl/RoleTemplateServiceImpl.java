package com.uav.platform.service.impl;

import com.uav.platform.dao.IPermissionDao;
import com.uav.platform.dao.IRoleTemplateDao;
import com.uav.platform.dao.IRoleTemplatePermissionDao;
import com.uav.platform.dto.response.RoleTemplateResponse;
import com.uav.platform.entity.Permission;
import com.uav.platform.entity.RoleTemplate;
import com.uav.platform.entity.RoleTemplatePermission;
import com.uav.platform.enums.AuditAction;
import com.uav.platform.enums.PermissionCode;
import com.uav.platform.enums.UserRole;
import com.uav.platform.mapper.RoleTemplateMapper;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.RoleTemplateService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;

@Service
@Transactional
public class RoleTemplateServiceImpl implements RoleTemplateService {
    private final IRoleTemplateDao templates;
    private final IRoleTemplatePermissionDao assignments;
    private final IPermissionDao permissions;
    private final AuditLogService audit;
    private final com.uav.platform.security.AccessRecoveryGuard recovery;
    private final RoleTemplateMapper roleTemplateMapper;

    public RoleTemplateServiceImpl(
            IRoleTemplateDao templates,
            IRoleTemplatePermissionDao assignments,
            IPermissionDao permissions,
            AuditLogService audit) {
        this(templates, assignments, permissions, audit, null);
    }

    public RoleTemplateServiceImpl(
            IRoleTemplateDao templates,
            IRoleTemplatePermissionDao assignments,
            IPermissionDao permissions,
            AuditLogService audit,
            com.uav.platform.security.AccessRecoveryGuard recovery) {
        this(
                templates,
                assignments,
                permissions,
                audit,
                recovery,
                org.mapstruct.factory.Mappers.getMapper(RoleTemplateMapper.class));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public RoleTemplateServiceImpl(
            IRoleTemplateDao templates,
            IRoleTemplatePermissionDao assignments,
            IPermissionDao permissions,
            AuditLogService audit,
            com.uav.platform.security.AccessRecoveryGuard recovery,
            RoleTemplateMapper roleTemplateMapper) {
        this.recovery = recovery;
        this.templates = templates;
        this.assignments = assignments;
        this.permissions = permissions;
        this.audit = audit;
        this.roleTemplateMapper = roleTemplateMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleTemplateResponse> list() {
        return templates.findAll().stream()
                .map(
                        t ->
                                roleTemplateMapper.toResponse(
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
