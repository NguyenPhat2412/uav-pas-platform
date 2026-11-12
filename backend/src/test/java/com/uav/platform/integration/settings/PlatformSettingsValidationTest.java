package com.uav.platform.integration.settings;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.settings.UpdateConfigurationRequest;
import com.uav.platform.entity.settings.SystemConfiguration;
import com.uav.platform.entity.settings.SystemConfigurationHistory;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.settings.SettingValueType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.settings.SystemConfigMapper;
import com.uav.platform.repository.settings.SystemConfigurationHistoryRepository;
import com.uav.platform.repository.settings.SystemConfigurationRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.settings.SystemConfigServiceImpl;
import com.uav.platform.service.impl.settings.SystemConfigurationOperations;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

class PlatformSettingsValidationTest {
    private static SystemConfiguration typed(
            String key, SettingValueType type, String min, String max, String allowed) {
        return SystemConfigurationOperations.createTyped(
                key,
                "",
                "OPS",
                type,
                min == null ? null : new BigDecimal(min),
                max == null ? null : new BigDecimal(max),
                allowed,
                false);
    }

    private static void ok(SystemConfiguration c, String value) {
        assertDoesNotThrow(() -> SystemConfigurationOperations.validate(c, value), value);
    }

    private static void bad(SystemConfiguration c, String value) {
        assertThrows(
                SystemException.class,
                () -> SystemConfigurationOperations.validate(c, value),
                value);
    }

    @Test
    void integersRespectTypeAndRange() {
        var c =
                typed(
                        "uav.safety.min_battery_threshold",
                        SettingValueType.INTEGER,
                        "5",
                        "95",
                        null);
        ok(c, "25");
        ok(c, " 5 ");
        for (String v : List.of("4", "96", "2.5", "abc", "", "1e2")) bad(c, v);
    }

    @Test
    void decimalsBooleansEnumsAndContactTypes() {
        var d =
                typed(
                        "ai.detection.confidence_threshold",
                        SettingValueType.DECIMAL,
                        "0",
                        "1",
                        null);
        ok(d, "0.75");
        ok(d, "1");
        for (String v : List.of("1.01", "-0.1", "NaN", "Infinity", "0x1")) bad(d, v);
        var b = typed("x.flag", SettingValueType.BOOLEAN, null, null, null);
        ok(b, "true");
        for (String v : List.of("TRUE", "yes", "1")) bad(b, v);
        var e =
                typed(
                        "ai.detection.orchestration_mode",
                        SettingValueType.ENUM,
                        null,
                        null,
                        "EDGE_PREFERRED,CLOUD_ONLY");
        ok(e, "CLOUD_ONLY");
        bad(e, "cloud_only");
        var phone = typed("contact.dispatch_hotline", SettingValueType.PHONE, null, null, null);
        ok(phone, "+84 24 3999 1234");
        ok(phone, "1900-1234");
        ok(phone, "");
        bad(phone, "call us");
        var email = typed("contact.email", SettingValueType.EMAIL, null, null, null);
        ok(email, "ops@example.vn");
        bad(email, "ops@");
        var url = typed("x.url", SettingValueType.URL, null, null, null);
        ok(url, "https://example.vn/path");
        bad(url, "javascript:alert(1)");
        bad(url, "");
    }

    @Test
    void billingKeysAllowEmptyAndFollowCommerceRulesEvenWithoutMetadata() {
        // Plain rows as seeded by V25 (no V27 metadata): built-in rules still apply.
        var vat =
                SystemConfigurationOperations.create(
                        "billing.vat_rate", "", "BILLING", null, "SYSTEM");
        ok(vat, "");
        ok(vat, "0.10");
        bad(vat, "10");
        var bin =
                SystemConfigurationOperations.create(
                        "billing.bank_bin", "", "BILLING", null, "SYSTEM");
        ok(bin, "");
        ok(bin, "970436");
        bad(bin, "97043");
        bad(bin, "97043a");
        var account =
                SystemConfigurationOperations.create(
                        "billing.bank_account_number", "", "BILLING", null, "SYSTEM");
        ok(account, "0123456789");
        bad(account, "123");
        bad(account, "12345678901234567890");
        var name =
                SystemConfigurationOperations.create(
                        "billing.bank_name", "", "BILLING", null, "SYSTEM");
        ok(name, "");
        ok(name, "Vietcombank – CN Hà Nội");
        var other =
                typed(
                        "uav.mission.max_flight_duration_minutes",
                        SettingValueType.INTEGER,
                        "1",
                        "600",
                        null);
        bad(other, "");
    }

    @Test
    void changeIsValidatedRecordedInHistoryAndAudited() {
        var repo = mock(SystemConfigurationRepository.class);
        var history = mock(SystemConfigurationHistoryRepository.class);
        var audit = mock(AuditLogService.class);
        var cfg =
                typed(
                        "uav.safety.min_battery_threshold",
                        SettingValueType.INTEGER,
                        "5",
                        "95",
                        null);
        cfg.setConfigValue("25");
        when(repo.findByConfigKey(cfg.getConfigKey())).thenReturn(Optional.of(cfg));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        var service =
                new SystemConfigServiceImpl(
                        repo, Mappers.getMapper(SystemConfigMapper.class), history, audit);
        var admin = new UsernamePasswordAuthenticationToken("root", null, List.of());

        assertThrows(
                SystemException.class,
                () ->
                        service.update(
                                cfg.getConfigKey(),
                                new UpdateConfigurationRequest("200", null),
                                admin));
        verify(history, never()).save(any());

        var response =
                service.update(
                        cfg.getConfigKey(), new UpdateConfigurationRequest(" 30 ", null), admin);
        assertEquals("30", response.configValue());
        assertEquals("INTEGER", response.valueType());
        var captor = ArgumentCaptor.forClass(SystemConfigurationHistory.class);
        verify(history).save(captor.capture());
        assertEquals("25", captor.getValue().getOldValue());
        assertEquals("30", captor.getValue().getNewValue());
        assertEquals("root", captor.getValue().getChangedBy());
        verify(audit)
                .record(
                        null,
                        "root",
                        AuditAction.UPDATE,
                        "SYSTEM_CONFIGURATION",
                        cfg.getConfigKey(),
                        "SETTING_CHANGED");

        // Saving the same value again writes no history row.
        service.update(cfg.getConfigKey(), new UpdateConfigurationRequest("30", null), admin);
        verify(history, times(1)).save(any());
    }
}
