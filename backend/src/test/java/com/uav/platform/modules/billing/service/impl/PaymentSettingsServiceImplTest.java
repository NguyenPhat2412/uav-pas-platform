package com.uav.platform.modules.billing.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.billing.service.PaymentSettingsService;
import com.uav.platform.modules.settings.service.SystemConfigService;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

class PaymentSettingsServiceImplTest {

    private PaymentSettingsServiceImpl service(Map<String, String> db) {
        var config = mock(SystemConfigService.class);
        when(config.valueOrDefault(anyString(), anyString()))
                .thenAnswer(i -> db.getOrDefault(i.getArgument(0), i.getArgument(1)));
        return new PaymentSettingsServiceImpl(
                config, "970415", "Env Bank", "123456789", "ENV HOLDER", new BigDecimal("0.08"));
    }

    @Test
    void emptyDatabaseValuesFallBackToEnvironment() {
        var s =
                service(
                                Map.of(
                                        PaymentSettingsService.BANK_BIN, "",
                                        PaymentSettingsService.BANK_NAME, "   ",
                                        PaymentSettingsService.VAT_RATE, ""))
                        .current();
        assertEquals("970415", s.bankBin());
        assertEquals("Env Bank", s.bankName());
        assertEquals("123456789", s.accountNumber());
        assertEquals("ENV HOLDER", s.accountName());
        assertEquals(new BigDecimal("0.08"), s.vatRate());
        assertTrue(s.configured());
    }

    @Test
    void nonEmptyDatabaseValuesOverrideEnvironmentPerKey() {
        var s =
                service(
                                Map.of(
                                        PaymentSettingsService.BANK_BIN, " 970436 ",
                                        PaymentSettingsService.BANK_ACCOUNT_NAME, "DB HOLDER",
                                        PaymentSettingsService.VAT_RATE, "0.05"))
                        .current();
        assertEquals("970436", s.bankBin());
        assertEquals("DB HOLDER", s.accountName());
        assertEquals("123456789", s.accountNumber());
        assertEquals(new BigDecimal("0.05"), s.vatRate());
    }

    @Test
    void invalidVatInDatabaseIsIgnored() {
        for (String bad : new String[] {"10", "-0.1", "abc", "1.5"})
            assertEquals(
                    new BigDecimal("0.08"),
                    PaymentSettingsServiceImpl.resolveVat(bad, new BigDecimal("0.08")),
                    bad);
        assertEquals(BigDecimal.ONE, PaymentSettingsServiceImpl.resolveVat("1", null));
        assertEquals(BigDecimal.ZERO, PaymentSettingsServiceImpl.resolveVat("0", null));
        assertEquals(
                new BigDecimal("0.10"),
                PaymentSettingsServiceImpl.resolveVat("", new BigDecimal("7")));
    }

    @Test
    void unreadableSettingsStoreKeepsEnvironmentValues() {
        var config = mock(SystemConfigService.class);
        when(config.valueOrDefault(anyString(), anyString()))
                .thenThrow(new IllegalStateException());
        var s = new PaymentSettingsServiceImpl(config, "970415", "B", "1234", "H", null).current();
        assertEquals("970415", s.bankBin());
        assertEquals(new BigDecimal("0.10"), s.vatRate());
    }

    @Test
    void incompleteAccountIsNotConfigured() {
        var config = mock(SystemConfigService.class);
        when(config.valueOrDefault(anyString(), anyString())).thenAnswer(i -> i.getArgument(1));
        var s = new PaymentSettingsServiceImpl(config, "", "", "", "", null).current();
        assertFalse(s.configured());
    }

    @Test
    void ipnRawCallbackRedactsCredentialLikeFields() {
        String raw = "PaymentIpnRequest[invoiceCode=INV-1, signature=abc123, token: xyz, amount=5]";
        String out = BillingAdminServiceImpl.redact(raw);
        assertFalse(out.contains("abc123"));
        assertFalse(out.contains("xyz"));
        assertTrue(out.contains("invoiceCode=INV-1"));
        assertTrue(out.contains("amount=5"));
        assertNull(BillingAdminServiceImpl.redact(null));
    }
}
