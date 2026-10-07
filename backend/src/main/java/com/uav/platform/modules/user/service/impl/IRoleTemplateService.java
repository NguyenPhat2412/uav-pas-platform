package com.uav.platform.modules.user.service.impl;

import com.uav.platform.modules.user.mapper.RoleTemplateMapper;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.config.response.RoleTemplateResponse;
import com.uav.platform.modules.user.entity.*;
import com.uav.platform.modules.user.repository.*;
import com.uav.platform.modules.user.service.RoleTemplateService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;

@Service
@Transactional
public class IRoleTemplateService implements RoleTemplateService {
    private final RoleTemplateRepository templates;
    private final RoleTemplatePermissionRepository assignments;
    private final PermissionRepository permissions;
    private final AuditLogService audit;
    private final com.uav.platform.security.AccessRecoveryGuard recovery;

    public IRoleTemplateService(RoleTemplateRepository templates, RoleTemplatePermissionRepository assignments,
                                   PermissionRepository permissions, AuditLogService audit) {
        this(templates, assignments, permissions, audit, null);
    }
    @org.springframework.beans.factory.annotation.Autowired
    public IRoleTemplateService(RoleTemplateRepository templates, RoleTemplatePermissionRepository assignments,
                                   PermissionRepository permissions, AuditLogService audit, com.uav.platform.security.AccessRecoveryGuard recovery) {
        this.recovery = recovery;
        this.templates = templates; this.assignments = assignments; this.permissions = permissions; this.audit = audit;
    }
    @Override @Transactional(readOnly = true)
    public List<RoleTemplateResponse> list() {
        return templates.findAll().stream().map(t -> RoleTemplateMapper.toResponse(t,
                assignments.findByRoleTemplateId(t.getId()).stream()
                        .map(a -> a.getPermission().getCode()).collect(java.util.stream.Collectors.toCollection(() -> EnumSet.noneOf(PermissionCode.class))))).toList();
    }
    @Override
    public void setPermission(UserRole role, PermissionCode code, boolean granted, String actor) {
        long before=recovery==null?0:recovery.begin();
        RoleTemplate template = templates.findByRole(role).orElseGet(() -> templates.save(new RoleTemplate(role, role.name())));
        Permission permission = permissions.findByCode(code).orElseGet(() -> permissions.save(new Permission(code, code.name())));
        assignments.findByRoleTemplateIdAndPermissionCode(template.getId(), code).ifPresentOrElse(existing -> {
            if (!granted) assignments.delete(existing);
        }, () -> { if (granted) assignments.save(new RoleTemplatePermission(template, permission)); });
        if(recovery!=null) recovery.finish(before);
        audit.record(null, actor, granted ? AuditAction.GRANT : AuditAction.REVOKE, "ROLE_TEMPLATE", role.name(), code.name());
    }
}
