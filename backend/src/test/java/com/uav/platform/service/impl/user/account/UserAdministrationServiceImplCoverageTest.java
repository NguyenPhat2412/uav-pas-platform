package com.uav.platform.service.impl.user.account;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.auth.IRefreshTokenDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.user.account.AdminCreateUserRequest;
import com.uav.platform.dto.request.user.account.BulkLockRequest;
import com.uav.platform.dto.request.user.account.PasswordResetRequest;
import com.uav.platform.dto.response.user.account.BulkActionResponse;
import com.uav.platform.dto.response.user.account.UserResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.user.account.UserMapper;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.session.SessionTerminationService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.user.account.UserService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class UserAdministrationServiceImplCoverageTest {

    private IUserDao userRepository;
    private UserService userService;
    private PasswordEncoder passwordEncoder;
    private AuditLogService auditLogService;
    private IRefreshTokenDao refreshTokens;
    private UserMapper userMapper;
    private UserAdministrationServiceImpl service;

    @BeforeEach
    void setUp() {
        userRepository = mock(IUserDao.class);
        userService = mock(UserService.class);
        passwordEncoder = mock(PasswordEncoder.class);
        auditLogService = mock(AuditLogService.class);
        refreshTokens = mock(IRefreshTokenDao.class);
        userMapper = mock(UserMapper.class);
        service =
                new UserAdministrationServiceImpl(
                        userRepository,
                        userService,
                        passwordEncoder,
                        auditLogService,
                        refreshTokens,
                        userMapper);
    }

    private static AppUser activeUser(Long id, String username, UserRole role) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        u.setEmail(username + "@uav.vn");
        u.setPhoneNumber("0912345678");
        return u;
    }

    @Test
    void createValidatesPhoneConfirmAndDuplicatesThenPersistsAndAudits() {
        // Invalid phone
        AdminCreateUserRequest badPhone =
                new AdminCreateUserRequest(
                        "u1", "u1@uav.vn", "Secret123!", "123", "Name", UserRole.ROLE_PILOT);
        assertThrows(SystemException.class, () -> service.create(badPhone, "staff"));

        // Mismatched confirmPassword
        AdminCreateUserRequest mismatch =
                new AdminCreateUserRequest(
                        "u1",
                        "u1@uav.vn",
                        "Secret123!",
                        "0912345678",
                        "Name",
                        UserRole.ROLE_PILOT,
                        "Different123!");
        assertThrows(SystemException.class, () -> service.create(mismatch, "staff"));

        // Duplicate username
        AdminCreateUserRequest req =
                new AdminCreateUserRequest(
                        " u1 ",
                        " u1@uav.vn ",
                        "Secret123!",
                        "+84912345678",
                        "   ",
                        UserRole.ROLE_PILOT,
                        "Secret123!");
        when(userRepository.existsByUsername("u1")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.create(req, "staff"));

        // Duplicate email
        when(userRepository.existsByUsername("u1")).thenReturn(false);
        when(userRepository.existsByEmail("u1@uav.vn")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.create(req, "staff"));

        // Duplicate phone
        when(userRepository.existsByEmail("u1@uav.vn")).thenReturn(false);
        when(userRepository.existsByPhoneNumber("0912345678")).thenReturn(true);
        assertThrows(SystemException.class, () -> service.create(req, "staff"));

        // Happy path with blank fullName
        when(userRepository.existsByPhoneNumber("0912345678")).thenReturn(false);
        when(passwordEncoder.encode("Secret123!")).thenReturn("encoded");
        when(userRepository.save(any(AppUser.class)))
                .thenAnswer(
                        inv -> {
                            AppUser saved = inv.getArgument(0);
                            saved.setId(55L);
                            return saved;
                        });
        UserResponse mapped = mock(UserResponse.class);
        when(userMapper.toResponse(any(AppUser.class))).thenReturn(mapped);

        UserResponse res = service.create(req, "staff");
        assertSame(mapped, res);
        verify(auditLogService)
                .record(
                        isNull(),
                        eq("staff"),
                        eq(AuditAction.CREATE),
                        eq("USER"),
                        eq("55"),
                        eq("role=ROLE_PILOT"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void createAdminRoleChecksAdminPrivilegesWithAndWithoutPermissionProvider() {
        AdminCreateUserRequest adminReq =
                new AdminCreateUserRequest(
                        "newadmin",
                        "newadmin@uav.vn",
                        "Secret123!",
                        "0988777666",
                        "New Admin",
                        UserRole.ROLE_ADMIN);

        // Non-admin actor without permissions provider -> forbidden
        AppUser operator = activeUser(2L, "op", UserRole.ROLE_OPERATOR);
        when(userRepository.findByUsername("op")).thenReturn(Optional.of(operator));
        assertThrows(SystemException.class, () -> service.create(adminReq, "op"));

        // Non-admin actor WITH permissions provider granting USER_PERMISSION_MANAGE -> allowed
        PermissionService permService = mock(PermissionService.class);
        ObjectProvider<PermissionService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(permService);
        when(permService.has(any(), eq("USER_PERMISSION_MANAGE"))).thenReturn(true);
        service.setPermissions(provider);

        when(passwordEncoder.encode("Secret123!")).thenReturn("enc");
        when(userRepository.save(any(AppUser.class)))
                .thenAnswer(
                        inv -> {
                            AppUser saved = inv.getArgument(0);
                            saved.setId(77L);
                            return saved;
                        });
        UserResponse expected = mock(UserResponse.class);
        when(userMapper.toResponse(any(AppUser.class))).thenReturn(expected);

        assertSame(expected, service.create(adminReq, "op"));
    }

    @Test
    void resetPasswordCoversNotFoundAdminGuardAndSessionTermination() {
        when(userRepository.findById(404L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.resetPassword(
                                404L, new PasswordResetRequest("NewPass123!"), "admin"));

        // Target is admin, actor is not admin -> forbidden
        AppUser targetAdmin = activeUser(1L, "root", UserRole.ROLE_ADMIN);
        AppUser staff = activeUser(2L, "staff", UserRole.ROLE_OPERATOR);
        when(userRepository.findById(1L)).thenReturn(Optional.of(targetAdmin));
        when(userRepository.findByUsername("staff")).thenReturn(Optional.of(staff));
        assertThrows(
                SystemException.class,
                () -> service.resetPassword(1L, new PasswordResetRequest("NewPass123!"), "staff"));

        // Target is admin, actor is admin + sessionTermination wired
        AppUser actorAdmin = activeUser(3L, "super", UserRole.ROLE_ADMIN);
        when(userRepository.findByUsername("super")).thenReturn(Optional.of(actorAdmin));
        when(passwordEncoder.encode("NewPass123!")).thenReturn("hashed");
        SessionTerminationService termination = mock(SessionTerminationService.class);
        service.setSessionTermination(termination);

        service.resetPassword(1L, new PasswordResetRequest("NewPass123!"), "super");

        assertEquals("hashed", targetAdmin.getPasswordHash());
        assertEquals(0, targetAdmin.getFailedAttempts());
        verify(refreshTokens).deleteByUser(targetAdmin);
        verify(termination).terminateAll(targetAdmin, "super");
        verify(auditLogService)
                .record(
                        isNull(),
                        eq("super"),
                        eq(AuditAction.UPDATE),
                        eq("USER"),
                        eq("1"),
                        eq("PASSWORD_RESET"));
    }

    @Test
    void bulkLockUnlocksWhenLockedIsFalse() {
        AppUser u1 = activeUser(10L, "admin", UserRole.ROLE_ADMIN);
        when(userRepository.findById(10L)).thenReturn(Optional.of(u1));

        BulkActionResponse res =
                service.bulkLock(new BulkLockRequest(List.of(10L), false), "admin");
        assertEquals(List.of(10L), res.processed());
        assertTrue(res.skipped().isEmpty());
        verify(userService).unlockUser(10L, "admin");
    }

    @Test
    @SuppressWarnings("unchecked")
    void exportCsvFormatsRowsWithNullAndFormulaValues() {
        AppUser u1 = activeUser(1L, "pilot", UserRole.ROLE_OPERATOR);
        u1.setFullName("=SUM(A1:A2)");
        u1.setEmail("pilot@uav.vn");
        u1.setPhoneNumber("0909123456");
        u1.setManualLocked(true);
        u1.setCreatedAt(LocalDateTime.of(2026, 5, 10, 14, 30));

        AppUser u2 = activeUser(2L, "+bad", UserRole.ROLE_PILOT);
        u2.setFullName(null);
        u2.setCreatedAt(null);

        when(userRepository.findAll(any(HibernateSpecification.class), any(Sort.class)))
                .thenReturn(List.of(u1, u2));

        String csv = service.exportCsv("pi", UserRole.ROLE_OPERATOR, UserStatus.ACTIVE);
        assertTrue(
                csv.startsWith(
                        "\uFEFFid,username,full_name,email,phone,role,status,locked,created_at\n"));
        assertTrue(csv.contains("\"'=SUM(A1:A2)\""));
        assertTrue(csv.contains("2026-05-10 14:30"));
        assertTrue(csv.contains("\"'+" + "bad\""));
    }
}
