package com.uav.platform.modules.user.service.impl;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.dto.request.RoleUpdateRequest;
import com.uav.platform.modules.user.dto.request.UserQueryRequest;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.mapper.UserMapper;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.UserService;
import com.uav.platform.modules.user.specification.UserSpecifications;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private static final Set<String> ALLOWED_SORT_FIELDS =
            Set.of(
                    "id",
                    "username",
                    "email",
                    "fullName",
                    "phoneNumber",
                    "role",
                    "status",
                    "createdAt",
                    "updatedAt");

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final com.uav.platform.security.AccessRecoveryGuard recovery;
    private final UserMapper userMapper;

    public UserServiceImpl(UserRepository userRepository) {
        this(userRepository, null);
    }

    public UserServiceImpl(
            UserRepository userRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
                    AuditLogService auditLogService) {
        this(userRepository, auditLogService, null);
    }

    public UserServiceImpl(
            UserRepository userRepository,
            AuditLogService auditLogService,
            com.uav.platform.security.AccessRecoveryGuard recovery) {
        this(
                userRepository,
                auditLogService,
                recovery,
                org.mapstruct.factory.Mappers.getMapper(UserMapper.class));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public UserServiceImpl(
            UserRepository userRepository,
            AuditLogService auditLogService,
            com.uav.platform.security.AccessRecoveryGuard recovery,
            UserMapper userMapper) {
        this.recovery = recovery;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.userMapper = userMapper;
    }

    @Override
    public PageResponse<UserResponse> getUsers(UserQueryRequest request) {
        int page = request.page();
        int size = request.size();
        String sortBy = request.sortBy();
        String direction = request.direction();
        String keyword = request.keyword();
        UserRole role = request.role();
        // Sanitize page and size parameters
        int pageIndex = Math.max(page, 0);
        int pageSize = Math.min(Math.max(size, 1), 100);

        // Sanitize sort field (whitelist validation)
        String safeSortBy =
                (sortBy != null && ALLOWED_SORT_FIELDS.contains(sortBy)) ? sortBy : "createdAt";
        Sort.Direction sortDirection =
                "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(sortDirection, safeSortBy));

        Specification<AppUser> spec =
                Specification.where(UserSpecifications.hasKeyword(keyword))
                        .and(UserSpecifications.hasRole(role));
        Page<AppUser> userPage = userRepository.findAll(spec, pageable);

        return PageResponse.from(userPage, userMapper::toResponse);
    }

    @Override
    public UserResponse getUserById(Long id) {
        if (id == null) {
            throw SystemException.badRequest("User ID must not be null");
        }

        AppUser user =
                userRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));

        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public void lockUser(Long id, String actor) {
        long before = recovery == null ? 0 : recovery.begin();
        AppUser user =
                userRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        UserAccountServiceImpl.lockAccount(user);
        userRepository.save(user);
        if (recovery != null) recovery.finish(before);
        record(actor, AuditAction.STATUS_CHANGE, id, "LOCKED");
    }

    @Override
    @Transactional
    public void unlockUser(Long id, String actor) {
        AppUser user =
                userRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        UserAccountServiceImpl.unlockAccount(user);
        userRepository.save(user);
        record(actor, AuditAction.STATUS_CHANGE, id, "UNLOCKED");
    }

    @Override
    @Transactional
    public UserResponse updateRole(Long id, RoleUpdateRequest request, String actor) {
        long before = recovery == null ? 0 : recovery.begin();
        AppUser user =
                userRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        UserRole previous = user.getRole();
        UserAccountServiceImpl.setRole(user, request.role());
        userRepository.save(user);
        if (recovery != null) recovery.finish(before);
        record(actor, AuditAction.UPDATE, id, "ROLE:" + previous + "->" + request.role());
        return userMapper.toResponse(user);
    }

    private void record(String actor, AuditAction action, Long id, String details) {
        if (auditLogService != null)
            auditLogService.record(null, actor, action, "USER", id.toString(), details);
    }
}
