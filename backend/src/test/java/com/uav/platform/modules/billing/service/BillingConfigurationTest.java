package com.uav.platform.modules.billing.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.settings.dto.request.UpdateConfigurationRequest;
import com.uav.platform.modules.settings.entity.SystemConfiguration;
import com.uav.platform.modules.settings.repository.SystemConfigurationRepository;
import com.uav.platform.modules.settings.service.impl.SystemConfigServiceImpl;

import org.junit.jupiter.api.Test;

import java.util.Optional;

class BillingConfigurationTest {
    @Test
    void enablingWithoutPriceIsRejected() {
        var repo = mock(SystemConfigurationRepository.class);
        var flag =
                new SystemConfiguration(
                        "billing.auto_generate_invoice", "false", "BILLING", null, "SYSTEM");
        when(repo.findByConfigKey("billing.auto_generate_invoice")).thenReturn(Optional.of(flag));
        lenient().when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        var service = new SystemConfigServiceImpl(repo);
        assertThrows(
                SystemException.class,
                () ->
                        service.update(
                                flag.getConfigKey(),
                                new UpdateConfigurationRequest("true", null),
                                null));
        assertEquals("false", flag.getConfigValue());
        verify(repo, never()).save(any());
    }

    @Test
    void nonPositiveOrMalformedRatesAreRejected() {
        var repo = mock(SystemConfigurationRepository.class);
        var rate =
                new SystemConfiguration("billing.hourly_rate_vnd", "", "BILLING", null, "SYSTEM");
        when(repo.findByConfigKey(rate.getConfigKey())).thenReturn(Optional.of(rate));
        lenient().when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        var service = new SystemConfigServiceImpl(repo);
        for (var value : new String[] {"0", "-1", "NaN", "9999999999999999999"})
            assertThrows(
                    SystemException.class,
                    () ->
                            service.update(
                                    rate.getConfigKey(),
                                    new UpdateConfigurationRequest(value, null),
                                    null));
        verify(repo, never()).save(any());
    }
}
