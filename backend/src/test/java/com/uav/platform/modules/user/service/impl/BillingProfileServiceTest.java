package com.uav.platform.modules.user.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.user.dto.request.BillingProfileRequest;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.entity.CustomerBillingProfile;
import com.uav.platform.modules.user.repository.CustomerBillingProfileRepository;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

class BillingProfileServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final CustomerBillingProfileRepository profiles = mock(CustomerBillingProfileRepository.class);
    private final BillingProfileServiceImpl service = new BillingProfileServiceImpl(users, profiles);

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
        var saved = service.update("pilot", new BillingProfileRequest(0L, " VJU ", "0101234567-001", " ", null, null));
        assertEquals("VJU", saved.organizationName());
        assertEquals("0101234567-001", saved.taxCode());
        assertNull(saved.billingAddress());
    }

    @Test
    void staleVersionIsRejected() {
        CustomerBillingProfile existing = new CustomerBillingProfile(7L);
        existing.setVersion(3);
        when(profiles.findById(7L)).thenReturn(Optional.of(existing));
        assertEquals("BILLING_PROFILE_STALE", assertThrows(SystemException.class,
                () -> service.update("pilot", new BillingProfileRequest(2L, "VJU", null, null, null, null))).getMessage());
    }
}
