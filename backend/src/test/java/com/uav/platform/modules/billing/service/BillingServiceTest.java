package com.uav.platform.modules.billing.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.dto.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.PaymentTransactionRepository;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.service.impl.BillingServiceImpl;
import com.uav.platform.modules.billing.service.impl.ServicePlanOperations;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.impl.UserAccountServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {
    @Mock ServicePlanRepository planRepository;
    @Mock InvoiceRepository invoiceRepository;
    @Mock PaymentTransactionRepository paymentRepository;
    @Mock UserRepository userRepository;
    @Mock MissionRepository missionRepository;
    @Mock PermissionService permissions;

    @org.mockito.Spy
    com.uav.platform.modules.billing.mapper.BillingMapper mapper =
            org.mapstruct.factory.Mappers.getMapper(
                    com.uav.platform.modules.billing.mapper.BillingMapper.class);

    @InjectMocks BillingServiceImpl service;

    @org.junit.jupiter.api.BeforeEach
    void events() {
        org.springframework.test.util.ReflectionTestUtils.setField(
                service,
                "financialEvents",
                org.mockito.Mockito.mock(
                        com.uav.platform.modules.webhook.service.FinancialOutboxService.class));
    }

    @Test
    void ownerCanReadInvoice() {
        AppUser owner = user(1L, "owner");
        Authentication auth = authentication("owner");
        Invoice invoice = invoice(owner);
        stubUser(auth, owner);
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice));

        assertEquals(10L, service.getInvoice(10L, auth).id());
    }

    @Test
    void otherUserCannotReadInvoice() {
        AppUser stranger = user(2L, "stranger");
        Authentication auth = authentication("stranger");
        stubUser(auth, stranger);
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice(user(1L, "owner"))));
        when(permissions.has(auth, "USER_MANAGE")).thenReturn(false);

        SystemException error =
                assertThrows(SystemException.class, () -> service.getInvoice(10L, auth));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test
    void userManageCanReadAnotherUsersInvoice() {
        AppUser manager = user(3L, "manager");
        Authentication auth = authentication("manager");
        stubUser(auth, manager);
        when(permissions.has(auth, "USER_MANAGE")).thenReturn(true);
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice(user(1L, "owner"))));

        assertEquals(10L, service.getInvoice(10L, auth).id());
    }

    @Test
    void revokedUserManageDoesNotGrantAccessBasedOnAdminAuthorityAlone() {
        AppUser admin = user(3L, "admin");
        Authentication auth =
                UsernamePasswordAuthenticationToken.authenticated(
                        "admin", "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        stubUser(auth, admin);
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice(user(1L, "owner"))));
        when(permissions.has(auth, "USER_MANAGE")).thenReturn(false);

        SystemException error =
                assertThrows(SystemException.class, () -> service.getInvoice(10L, auth));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test
    void ownerInvoiceListingUsesOwnerScopedRepositoryQuery() {
        AppUser owner = user(1L, "owner");
        Authentication auth = authentication("owner");
        Pageable pageable = PageRequest.of(0, 10);
        stubUser(auth, owner);
        when(invoiceRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(invoice(owner)), pageable, 1));

        assertEquals(1, service.listInvoices(auth, pageable).content().size());

        verify(invoiceRepository).findByUserIdOrderByCreatedAtDesc(1L, pageable);
        verify(invoiceRepository, never()).findAll(pageable);
    }

    @Test
    void userManageInvoiceListingUsesAllInvoicesRepositoryQuery() {
        AppUser manager = user(3L, "manager");
        Authentication auth = authentication("manager");
        Pageable pageable = PageRequest.of(0, 10);
        stubUser(auth, manager);
        when(permissions.has(auth, "USER_MANAGE")).thenReturn(true);
        when(invoiceRepository.findAll(pageable))
                .thenReturn(new PageImpl<>(List.of(invoice(user(1L, "owner"))), pageable, 1));

        assertEquals(1, service.listInvoices(auth, pageable).content().size());

        verify(invoiceRepository).findAll(pageable);
        verify(invoiceRepository, never())
                .findByUserIdOrderByCreatedAtDesc(anyLong(), eq(pageable));
    }

    @Test
    void ownerPaymentFailsClosedWithoutChangingInvoiceOrWritingTransactions() {
        AppUser owner = user(1L, "owner");
        Authentication auth = authentication("owner");
        Invoice invoice = invoice(owner);
        stubUser(auth, owner);
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice));

        SystemException error =
                assertThrows(SystemException.class, () -> service.payInvoice(10L, null, auth));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        assertEquals("PAYMENT_UNAVAILABLE", error.getCode());
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());
        assertNull(invoice.getPaidAt());
        verify(invoiceRepository, never()).save(any());
        verifyNoInteractions(paymentRepository);
    }

    @Test
    void strangerCannotAttemptPaymentAndNoPaymentWritesOccur() {
        AppUser stranger = user(2L, "stranger");
        Authentication auth = authentication("stranger");
        stubUser(auth, stranger);
        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice(user(1L, "owner"))));
        when(permissions.has(auth, "USER_MANAGE")).thenReturn(false);

        SystemException error =
                assertThrows(SystemException.class, () -> service.payInvoice(10L, null, auth));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(invoiceRepository, never()).save(any());
        verifyNoInteractions(paymentRepository);
    }

    @Test
    void nullAndUnauthenticatedPrincipalsAreDenied() {
        Authentication unauthenticated =
                UsernamePasswordAuthenticationToken.unauthenticated("owner", "");

        SystemException nullError =
                assertThrows(
                        SystemException.class,
                        () -> service.listInvoices(null, PageRequest.of(0, 10)));
        SystemException unauthenticatedError =
                assertThrows(
                        SystemException.class,
                        () -> service.listInvoices(unauthenticated, PageRequest.of(0, 10)));

        assertEquals(HttpStatus.UNAUTHORIZED, nullError.getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, unauthenticatedError.getStatus());
        verifyNoInteractions(invoiceRepository);
    }

    @Test
    void lockedUserIsDenied() {
        AppUser locked = user(1L, "owner");
        UserAccountServiceImpl.lockAccount(locked);
        Authentication auth = authentication("owner");
        stubUser(auth, locked);

        SystemException error =
                assertThrows(
                        SystemException.class,
                        () -> service.listInvoices(auth, PageRequest.of(0, 10)));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verifyNoInteractions(invoiceRepository);
    }

    @Test
    void invoiceCreationWithoutUserManageIsForbiddenWithoutSaving() {
        AppUser user = user(1L, "owner");
        Authentication auth = authentication("owner");
        stubUser(auth, user);
        when(permissions.has(auth, "USER_MANAGE")).thenReturn(false);

        SystemException error =
                assertThrows(
                        SystemException.class,
                        () -> service.createInvoice(createRequest(null, null), auth));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("PERMISSION_DENIED", error.getCode());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void missingMissionIsNotFoundAndInvoiceIsNotSaved() {
        AppUser owner = user(1L, "owner");
        Authentication auth = authentication("manager");
        allowInvoiceCreation(auth, user(3L, "manager"), owner);
        when(missionRepository.findById(20L)).thenReturn(Optional.empty());

        SystemException error =
                assertThrows(
                        SystemException.class,
                        () -> service.createInvoice(createRequest(20L, null), auth));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void missionForAnotherCustomerIsRejectedAndInvoiceIsNotSaved() {
        AppUser owner = user(1L, "owner");
        AppUser stranger = user(2L, "stranger");
        Authentication auth = authentication("manager");
        Mission mission = org.mockito.Mockito.mock(Mission.class);
        when(mission.getCustomer()).thenReturn(stranger);
        allowInvoiceCreation(auth, user(3L, "manager"), owner);
        when(missionRepository.findById(20L)).thenReturn(Optional.of(mission));

        SystemException error =
                assertThrows(
                        SystemException.class,
                        () -> service.createInvoice(createRequest(20L, null), auth));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void missingServicePlanIsNotFoundAndInvoiceIsNotSaved() {
        AppUser owner = user(1L, "owner");
        Authentication auth = authentication("manager");
        allowInvoiceCreation(auth, user(3L, "manager"), owner);
        when(planRepository.findById(30L)).thenReturn(Optional.empty());

        SystemException error =
                assertThrows(
                        SystemException.class,
                        () -> service.createInvoice(createRequest(null, 30L), auth));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void inactiveServicePlanIsRejectedAndInvoiceIsNotSaved() {
        AppUser owner = user(1L, "owner");
        Authentication auth = authentication("manager");
        ServicePlan plan = plan();
        plan.setActive(false);
        allowInvoiceCreation(auth, user(3L, "manager"), owner);
        when(planRepository.findById(30L)).thenReturn(Optional.of(plan));

        SystemException error =
                assertThrows(
                        SystemException.class,
                        () -> service.createInvoice(createRequest(null, 30L), auth));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(invoiceRepository, never()).save(any());
    }

    @Test
    void validInvoiceCreationSavesSameCustomersMissionAndActivePlan() {
        AppUser owner = user(1L, "owner");
        Authentication auth = authentication("manager");
        Mission mission =
                MissionOperations.draft(
                        owner,
                        MissionType.OTHER,
                        "Inspection",
                        null,
                        LocalDate.now(),
                        LocalDateTime.now(),
                        LocalDateTime.now().plusHours(1),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setId(20L);
        ServicePlan plan = plan();
        plan.setId(30L);
        allowInvoiceCreation(auth, user(3L, "manager"), owner);
        when(missionRepository.findById(20L)).thenReturn(Optional.of(mission));
        when(planRepository.findById(30L)).thenReturn(Optional.of(plan));
        when(invoiceRepository.save(any(Invoice.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.createInvoice(createRequest(20L, 30L), auth);

        assertEquals(owner.getId(), response.userId());
        assertEquals(20L, response.missionId());
        assertEquals(30L, response.planId());
        verify(permissions).has(auth, "USER_MANAGE");
        verify(invoiceRepository).save(any(Invoice.class));
    }

    private void allowInvoiceCreation(Authentication auth, AppUser manager, AppUser target) {
        stubUser(auth, manager);
        when(permissions.has(auth, "USER_MANAGE")).thenReturn(true);
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
    }

    private void stubUser(Authentication auth, AppUser user) {
        when(userRepository.findByUsername(auth.getName())).thenReturn(Optional.of(user));
    }

    private AppUser user(Long id, String username) {
        AppUser user =
                new AppUser(username, username + "@example.test", "hash", null, UserStatus.ACTIVE);
        user.setId(id);
        return user;
    }

    private Authentication authentication(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, "", List.of());
    }

    private Invoice invoice(AppUser owner) {
        Invoice invoice =
                new Invoice(
                        "INV-TEST",
                        owner,
                        null,
                        null,
                        new BigDecimal("100.00"),
                        LocalDateTime.now().plusDays(7),
                        null);
        invoice.setId(10L);
        return invoice;
    }

    private CreateInvoiceRequest createRequest(Long missionId, Long planId) {
        return new CreateInvoiceRequest(
                1L, missionId, planId, new BigDecimal("100.00"), "test invoice");
    }

    private ServicePlan plan() {
        return ServicePlanOperations.create(
                "PLAN-TEST",
                "Test Plan",
                new BigDecimal("100.00"),
                "MONTHLY",
                20.0,
                1,
                false,
                null);
    }
}
