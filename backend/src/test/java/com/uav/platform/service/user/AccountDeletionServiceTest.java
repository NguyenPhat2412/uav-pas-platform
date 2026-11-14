package com.uav.platform.service.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.controller.user.UserProfileController;
import com.uav.platform.dto.request.user.AccountDeletionRequest;
import com.uav.platform.dto.response.user.AccountDeletionPolicyResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.UserQuotaRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.notification.PushDeviceTokenRepository;
import com.uav.platform.repository.permission.UserPermissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.AuthSessionLock;
import com.uav.platform.service.auth.RefreshTokenService;
import com.uav.platform.service.auth.SessionTerminationService;
import com.uav.platform.service.impl.user.UserProfileServiceImpl;
import com.uav.platform.service.security.SessionRevocationService;
import com.uav.platform.service.settings.SystemConfigService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class AccountDeletionServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private AuthSessionLock sessionLock;
    @Mock private AuditLogService auditLogService;
    @Mock private SystemConfigService systemConfigService;
    @Mock private MissionRepository missionRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private SessionRevocationService sessionRevocationService;
    @Mock private SessionTerminationService sessionTerminationService;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private PushDeviceTokenRepository pushDeviceTokenRepository;
    @Mock private UserPermissionRepository userPermissionRepository;
    @Mock private UserQuotaRepository userQuotaRepository;

    private final Map<String, String> settings = new HashMap<>();
    private UserProfileServiceImpl service;

    @BeforeEach
    void setUp() {
        lenient()
                .when(sessionLock.lock(any(AppUser.class)))
                .thenAnswer(call -> call.getArgument(0));
        lenient()
                .when(systemConfigService.valueOrDefault(anyString(), anyString()))
                .thenAnswer(
                        call -> {
                            String key = call.getArgument(0);
                            String fallback = call.getArgument(1);
                            return settings.getOrDefault(key, fallback);
                        });
        lenient()
                .when(missionRepository.countActiveByUserId(any(), anyCollection()))
                .thenReturn(0L);
        lenient()
                .when(invoiceRepository.countByUserIdAndStatus(any(), eq(InvoiceStatus.PENDING)))
                .thenReturn(0L);
        lenient().when(missionRepository.countAnyByUserId(any())).thenReturn(0L);
        lenient().when(invoiceRepository.countByUserId(any())).thenReturn(0L);

        service = new UserProfileServiceImpl(userRepository, sessionLock, auditLogService);
        service.setSystemConfigService(systemConfigService);
        service.setMissionRepository(missionRepository);
        service.setInvoiceRepository(invoiceRepository);
        service.setPasswordEncoder(passwordEncoder);
        service.setSessionRevocationService(sessionRevocationService);
        service.setSessionTerminationService(sessionTerminationService);
        service.setRefreshTokenService(refreshTokenService);
        service.setPushDeviceTokenRepository(pushDeviceTokenRepository);
        service.setUserPermissionRepository(userPermissionRepository);
        service.setUserQuotaRepository(userQuotaRepository);
    }

    private AppUser pilotWithPassword() {
        AppUser user =
                new AppUser(
                        "pilot_one",
                        "pilot.one@icloud.com",
                        "bcrypt-hash",
                        "0987654321",
                        "Nguyễn Phi Công",
                        "https://cdn.example/avatar.png",
                        UserRole.ROLE_PILOT,
                        UserStatus.ACTIVE);
        user.setId(42L);
        user.setEmailVerified(true);
        user.setTwoFactorEnabled(true);
        user.setTotpSecret("totp-secret");
        user.setAppleSub("001234.apple_sub");
        when(userRepository.findByUsername("pilot_one")).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void adminDisabledToggle_BlocksPolicyAndDeletionWith403() {
        pilotWithPassword();
        settings.put(UserProfileServiceImpl.KEY_DELETION_ENABLED, "false");

        AccountDeletionPolicyResponse policy = service.getDeletionPolicy("pilot_one");
        assertFalse(policy.enabled());
        assertFalse(policy.eligible());
        assertEquals("ACCOUNT_DELETION_DISABLED", policy.ineligibleReasonCode());

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.deleteOwnAccount(
                                        "pilot_one",
                                        new AccountDeletionRequest(
                                                "Pw#123", "XOA TAI KHOAN", null)));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        assertEquals("ACCOUNT_DELETION_DISABLED", ex.getCode());
        verify(userRepository, never()).save(any());
        verify(userRepository, never()).delete(any(AppUser.class));
    }

    @Test
    void adminAndStaffRoleGovernance_FollowsAllowStaffRolesSetting() {
        AppUser admin =
                new AppUser(
                        "root_admin",
                        "admin@uav.vn",
                        "hash",
                        null,
                        "Admin",
                        null,
                        UserRole.ROLE_ADMIN,
                        UserStatus.ACTIVE);
        admin.setId(1L);
        when(userRepository.findByUsername("root_admin")).thenReturn(Optional.of(admin));
        settings.put(UserProfileServiceImpl.KEY_DELETION_ALLOW_STAFF, "true");

        AccountDeletionPolicyResponse adminPolicy = service.getDeletionPolicy("root_admin");
        assertFalse(adminPolicy.eligible());
        assertEquals("ADMIN_PROTECTED", adminPolicy.ineligibleReasonCode());

        AppUser operator =
                new AppUser(
                        "ops_one",
                        "ops@uav.vn",
                        "hash",
                        null,
                        "Operator",
                        null,
                        UserRole.ROLE_OPERATOR,
                        UserStatus.ACTIVE);
        operator.setId(2L);
        when(userRepository.findByUsername("ops_one")).thenReturn(Optional.of(operator));

        settings.put(UserProfileServiceImpl.KEY_DELETION_ALLOW_STAFF, "false");
        AccountDeletionPolicyResponse restricted = service.getDeletionPolicy("ops_one");
        assertFalse(restricted.eligible());
        assertEquals("STAFF_ROLE_RESTRICTED", restricted.ineligibleReasonCode());

        settings.put(UserProfileServiceImpl.KEY_DELETION_ALLOW_STAFF, "true");
        AccountDeletionPolicyResponse allowed = service.getDeletionPolicy("ops_one");
        assertTrue(allowed.eligible());
        assertNull(allowed.ineligibleReasonCode());
    }

    @Test
    void activeMissionsAndUnpaidInvoices_BlockWhenConfiguredAndPassWhenToggledOff() {
        pilotWithPassword();
        when(missionRepository.countActiveByUserId(eq(42L), anyCollection())).thenReturn(2L);
        when(invoiceRepository.countByUserIdAndStatus(42L, InvoiceStatus.PENDING)).thenReturn(1L);

        AccountDeletionPolicyResponse blockedMissions = service.getDeletionPolicy("pilot_one");
        assertFalse(blockedMissions.eligible());
        assertEquals("ACTIVE_MISSIONS_BLOCKING", blockedMissions.ineligibleReasonCode());
        assertEquals(2L, blockedMissions.activeMissionCount());
        assertEquals(1L, blockedMissions.unpaidInvoiceCount());

        SystemException missionConflict =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.deleteOwnAccount(
                                        "pilot_one",
                                        new AccountDeletionRequest(
                                                "Pw#123", "XOA TAI KHOAN", null)));
        assertEquals(HttpStatus.CONFLICT, missionConflict.getStatus());
        assertEquals("ACTIVE_MISSIONS_BLOCKING", missionConflict.getCode());

        settings.put(UserProfileServiceImpl.KEY_DELETION_BLOCK_MISSIONS, "false");
        AccountDeletionPolicyResponse blockedInvoices = service.getDeletionPolicy("pilot_one");
        assertFalse(blockedInvoices.eligible());
        assertEquals("UNPAID_INVOICES_BLOCKING", blockedInvoices.ineligibleReasonCode());

        settings.put(UserProfileServiceImpl.KEY_DELETION_BLOCK_INVOICES, "false");
        AccountDeletionPolicyResponse unblocked = service.getDeletionPolicy("pilot_one");
        assertTrue(unblocked.eligible());
    }

    @Test
    void customPhraseRequirePasswordAndRequireReason_EnforcedDynamically() {
        AppUser user = pilotWithPassword();
        settings.put(UserProfileServiceImpl.KEY_DELETION_CONFIRMATION_PHRASE, "XAC NHAN HUY");
        settings.put(UserProfileServiceImpl.KEY_DELETION_REQUIRE_REASON, "true");

        SystemException badPhrase =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.deleteOwnAccount(
                                        "pilot_one",
                                        new AccountDeletionRequest(
                                                "Correct#123", "XOA TAI KHOAN", "Không dùng nữa")));
        assertEquals("INVALID_CONFIRMATION_PHRASE", badPhrase.getCode());
        assertEquals("confirmationPhrase", badPhrase.getField());

        when(passwordEncoder.matches("WrongPw", "bcrypt-hash")).thenReturn(false);
        SystemException badPw =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.deleteOwnAccount(
                                        "pilot_one",
                                        new AccountDeletionRequest(
                                                "WrongPw", "xac nhan huy", "Không dùng nữa")));
        assertEquals("INVALID_CURRENT_PASSWORD", badPw.getCode());
        assertEquals("currentPassword", badPw.getField());

        when(passwordEncoder.matches("Correct#123", "bcrypt-hash")).thenReturn(true);
        SystemException missingReason =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.deleteOwnAccount(
                                        "pilot_one",
                                        new AccountDeletionRequest(
                                                "Correct#123", "  xac nhan huy  ", "   ")));
        assertEquals("REASON_REQUIRED", missingReason.getCode());
        assertEquals("reason", missingReason.getField());

        service.deleteOwnAccount(
                "pilot_one",
                new AccountDeletionRequest(
                        "Correct#123",
                        "  xac nhan huy  ",
                        "  Chuyển sang tài khoản doanh nghiệp  "));

        assertEquals(UserStatus.INACTIVE, user.getStatus());
        assertTrue(user.isManualLocked());
        assertNull(user.getPasswordHash());
        assertNull(user.getAppleSub());
        assertNull(user.getPhoneNumber());
        assertEquals("Tài khoản đã xoá", user.getFullName());
        assertNull(user.getAvatarUrl());
        assertNull(user.getTotpSecret());
        assertFalse(user.isTwoFactorEnabled());
        assertFalse(user.isEmailVerified());
        assertNotNull(user.getDeletedAt());
        assertEquals("Chuyển sang tài khoản doanh nghiệp", user.getDeletionReason());
        assertTrue(user.getUsername().startsWith("deleted_42_"));
        assertTrue(user.getEmail().startsWith("deleted+42."));
        assertTrue(user.getEmail().endsWith("@deleted.invalid"));

        verify(sessionTerminationService).terminateAll(user, "pilot_one");
        verify(sessionRevocationService).revokeAccessTokens(List.of(42L), "pilot_one");
        verify(refreshTokenService).deleteByUser(user);
        verify(pushDeviceTokenRepository).deleteByUserId(42L);
        verify(userRepository).save(user);
        verify(auditLogService)
                .record(
                        42L,
                        "pilot_one",
                        AuditAction.DELETE,
                        "USER_ACCOUNT",
                        "42",
                        "SELF_ACCOUNT_DELETED:ANONYMIZE");
    }

    @Test
    void socialOnlyUserWithoutPassword_DeletesWithoutPasswordAndHardDeleteHonorsHistory() {
        AppUser socialUser = pilotWithPassword();
        socialUser.setPasswordHash(null);
        settings.put(UserProfileServiceImpl.KEY_DELETION_REQUIRE_PASSWORD, "true");
        settings.put(UserProfileServiceImpl.KEY_DELETION_MODE, "HARD_DELETE");

        AccountDeletionPolicyResponse policy = service.getDeletionPolicy("pilot_one");
        assertFalse(policy.hasPassword());
        assertFalse(policy.requirePassword());
        assertEquals("HARD_DELETE", policy.mode());

        // Zero historical missions & invoices -> executes true HARD_DELETE
        service.deleteOwnAccount(
                "pilot_one", new AccountDeletionRequest(null, "XOA TAI KHOAN", null));

        verify(userPermissionRepository).deleteByUserId(42L);
        verify(userQuotaRepository).deleteByUserId(42L);
        verify(userRepository).delete(socialUser);
        verify(auditLogService)
                .record(
                        42L,
                        "pilot_one",
                        AuditAction.DELETE,
                        "USER_ACCOUNT",
                        "42",
                        "SELF_ACCOUNT_DELETED:HARD_DELETE");

        // If historical invoices exist -> HARD_DELETE falls back to ANONYMIZE to preserve ledger
        AppUser withHistory =
                new AppUser(
                        "pilot_two",
                        "pilot.two@icloud.com",
                        null,
                        null,
                        "Pilot Two",
                        null,
                        UserRole.ROLE_PILOT,
                        UserStatus.ACTIVE);
        withHistory.setId(99L);
        when(userRepository.findByUsername("pilot_two")).thenReturn(Optional.of(withHistory));
        when(invoiceRepository.countByUserId(99L)).thenReturn(3L);

        service.deleteOwnAccount(
                "pilot_two", new AccountDeletionRequest(null, "XOA TAI KHOAN", null));

        verify(userRepository, never()).delete(withHistory);
        verify(userRepository).save(withHistory);
        verify(auditLogService)
                .record(
                        99L,
                        "pilot_two",
                        AuditAction.DELETE,
                        "USER_ACCOUNT",
                        "99",
                        "SELF_ACCOUNT_DELETED:ANONYMIZE");
    }

    @Test
    void userProfileController_ExposesDeletionPolicyAndDeleteEndpoints() throws Exception {
        UserProfileService mockProfileService = mock(UserProfileService.class);
        MockMvc mvc =
                MockMvcBuilders.standaloneSetup(new UserProfileController(mockProfileService))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        var auth = new UsernamePasswordAuthenticationToken("pilot_one", null, List.of());

        when(mockProfileService.getDeletionPolicy("pilot_one"))
                .thenReturn(
                        new AccountDeletionPolicyResponse(
                                true,
                                true,
                                null,
                                null,
                                false,
                                false,
                                false,
                                "XOA TAI KHOAN",
                                "ANONYMIZE",
                                true,
                                true,
                                0,
                                0,
                                "Thông điệp lưu ý"));

        mvc.perform(get(ApiRoutes.Users.FULL_PROFILE_DELETION_POLICY).principal(auth))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.confirmationPhrase").value("XOA TAI KHOAN"));

        mvc.perform(
                        post(ApiRoutes.Users.FULL_PROFILE_DELETE)
                                .principal(auth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"confirmationPhrase\":\"XOA TAI KHOAN\"}"))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.message").value("Tài khoản của bạn đã được xoá thành công."));
    }
}
