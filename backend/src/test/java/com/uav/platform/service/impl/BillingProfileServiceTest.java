package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.ICustomerBillingProfileDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.BillingProfileRequest;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.CustomerBillingProfile;
import com.uav.platform.error.SystemException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

class BillingProfileServiceTest {
    private final IUserDao users = mock(IUserDao.class);
    private final ICustomerBillingProfileDao profiles = mock(ICustomerBillingProfileDao.class);
    private final BillingProfileServiceImpl service =
            new BillingProfileServiceImpl(users, profiles);

    @BeforeEach
    void setUp() {
        AppUser user = new AppUser();
        ReflectionTestUtils.setField(user, "id", 7L);
        when(users.findByUsername("pilot")).thenReturn(Optional.of(user));
        when(profiles.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void unsavedProfileReadsAsEmptyVersionZero() {
        when(profiles.findById(7L)).thenReturn(Optional.empty());
        assertEquals(0, service.get("pilot").version());
    }

    @Test
    void firstSaveCreatesTheRowAndBlankFieldsBecomeNull() {
        when(profiles.findById(7L)).thenReturn(Optional.empty());
        var saved =
                service.update(
                        "pilot",
                        new BillingProfileRequest(0L, " ACME ", "0101234567-001", " ", null, null));
        assertEquals("ACME", saved.organizationName());
        assertEquals("0101234567-001", saved.taxCode());
        assertNull(saved.billingAddress());
    }

    @Test
    void staleVersionIsRejected() {
        CustomerBillingProfile existing = new CustomerBillingProfile(7L);
        existing.setVersion(3);
        when(profiles.findById(7L)).thenReturn(Optional.of(existing));
        assertEquals(
                "BILLING_PROFILE_STALE",
                assertThrows(
                                SystemException.class,
                                () ->
                                        service.update(
                                                "pilot",
                                                new BillingProfileRequest(
                                                        2L, "ACME", null, null, null, null)))
                        .getMessage());
    }

    @Test
    void billingEmailIsNormalizedAndValidated() {
        when(profiles.findById(7L)).thenReturn(Optional.empty());
        var saved =
                service.update(
                        "pilot",
                        new BillingProfileRequest(
                                0L,
                                "ACME Vietnam",
                                "0101234567",
                                "Hà Nội",
                                "  Accounting@Acme.VN ",
                                null,
                                null));
        assertEquals("accounting@acme.vn", saved.billingEmail());

        SystemException invalid =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.update(
                                        "pilot",
                                        new BillingProfileRequest(
                                                0L,
                                                "ACME",
                                                null,
                                                null,
                                                "not-an-email",
                                                null,
                                                null)));
        assertEquals("BILLING_EMAIL_INVALID", invalid.getCode());
        assertEquals("billingEmail", invalid.getField());
    }
}
