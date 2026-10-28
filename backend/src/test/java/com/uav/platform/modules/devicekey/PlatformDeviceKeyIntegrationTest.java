package com.uav.platform.modules.devicekey;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.modules.devicekey.dto.request.CreateDeviceKeyRequest;
import com.uav.platform.modules.devicekey.repository.DeviceApiKeyRepository;
import com.uav.platform.modules.devicekey.service.DeviceKeyService;
import com.uav.platform.modules.settings.enums.SettingValueType;
import com.uav.platform.modules.settings.repository.SystemConfigurationRepository;
import com.uav.platform.modules.settings.service.impl.SystemConfigurationOperations;
import com.uav.platform.modules.uav.dto.request.UavRequest;
import com.uav.platform.modules.uav.service.UavService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Device-key filter, public site-info and settings history through the real security chain. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:platform_device_keys;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class PlatformDeviceKeyIntegrationTest {
    static final String HEADER = "X-Device-Key";

    @Autowired WebApplicationContext context;
    @Autowired DeviceKeyService deviceKeys;
    @Autowired DeviceApiKeyRepository keyRepository;
    @Autowired UavService uavs;
    @Autowired UserRepository users;
    @Autowired SystemConfigurationRepository settings;
    private MockMvc mvc;
    private AppUser admin;
    private Long uavId;
    private Long otherUavId;

    @BeforeEach
    void fixture() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        String s = UUID.randomUUID().toString().substring(0, 8);
        admin =
                users.save(
                        new AppUser(
                                "dk_admin_" + s,
                                "dk_admin_" + s + "@example.invalid",
                                "synthetic-placeholder",
                                null,
                                null,
                                null,
                                null,
                                UserRole.ROLE_ADMIN,
                                UserStatus.ACTIVE));
        uavId =
                uavs.create(new UavRequest("Key test", "DK-" + s, "Synthetic"), admin.getUsername())
                        .id();
        otherUavId =
                uavs.create(
                                new UavRequest("Key test 2", "DK2-" + s, "Synthetic"),
                                admin.getUsername())
                        .id();
    }

    private UsernamePasswordAuthenticationToken adminAuth() {
        return new UsernamePasswordAuthenticationToken(
                admin.getUsername(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private String newKey(Long boundUav) {
        return deviceKeys
                .create(new CreateDeviceKeyRequest("Gateway", boundUav, null), admin.getUsername())
                .secret();
    }

    private static String sample() {
        return "{\"recordedAt\":\""
                + LocalDateTime.now().minusSeconds(5).withNano(0)
                + "\",\"latitude\":21.03,\"longitude\":105.85,\"batteryPct\":80}";
    }

    private MockHttpServletRequestBuilder telemetry(Long id, String key) {
        return post("/api/v1/uavs/" + id + "/telemetry")
                .header(HEADER, key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(sample());
    }

    @Test
    void validKeyWritesTelemetryWithoutCsrfAndIsStampedAsDevice() throws Exception {
        String key = newKey(uavId);
        assertTrue(key.startsWith("uavk_") && key.length() == 48);
        mvc.perform(telemetry(uavId, key))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.uavId").value(uavId));
        var stored =
                keyRepository.findAll().stream()
                        .filter(k -> key.substring(5, 13).equals(k.getKeyPrefix()))
                        .findFirst()
                        .orElseThrow();
        assertNotNull(stored.getLastUsedAt());
        assertNotEquals(key, stored.getKeyHash());
        assertEquals(64, stored.getKeyHash().length());
    }

    @Test
    void validKeyCannotReachAnyOtherEndpoint() throws Exception {
        String key = newKey(null);
        mvc.perform(get("/api/v1/uavs/" + uavId + "/telemetry/latest").header(HEADER, key))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/auth/me").header(HEADER, key)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/settings").header(HEADER, key)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/device-keys").header(HEADER, key))
                .andExpect(status().isForbidden());
        mvc.perform(
                        post("/api/v1/admin/device-keys")
                                .header(HEADER, key)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"x\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/uavs").header(HEADER, key)).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/public/site-info").header(HEADER, key))
                .andExpect(status().isForbidden());
        // Path variations do not reach the telemetry route as something else.
        mvc.perform(
                        post("/api/v1/uavs/" + uavId + "/telemetry/latest")
                                .header(HEADER, key)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(sample()))
                .andExpect(status().isForbidden());
        mvc.perform(
                        put("/api/v1/uavs/" + uavId + "/telemetry")
                                .header(HEADER, key)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(sample()))
                .andExpect(status().isForbidden());
    }

    @Test
    void keyCannotBeCombinedWithAUserSessionToEscalate() throws Exception {
        String key = newKey(null);
        // Admin session + device key: the request is treated as the device only.
        mvc.perform(get("/api/v1/settings").header(HEADER, key).with(authentication(adminAuth())))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/settings").header(HEADER, key).header("Authorization", "Bearer x"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/settings").header(HEADER, key).header(HEADER, key))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void badRevokedAndExpiredKeysGetABare401() throws Exception {
        for (String bad : List.of("", "nope", "uavk_" + "A".repeat(43), newKey(uavId) + "x")) {
            String body =
                    mvc.perform(telemetry(uavId, bad))
                            .andExpect(status().isUnauthorized())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            assertTrue(body.contains("DEVICE_KEY_INVALID"));
        }
        String revoked = newKey(uavId);
        Long revokedId =
                keyRepository.findAll().stream()
                        .filter(k -> revoked.substring(5, 13).equals(k.getKeyPrefix()))
                        .findFirst()
                        .orElseThrow()
                        .getId();
        mvc.perform(
                        post("/api/v1/admin/device-keys/" + revokedId + "/revoke")
                                .with(authentication(adminAuth()))
                                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVOKED"));
        mvc.perform(telemetry(uavId, revoked)).andExpect(status().isUnauthorized());

        String expired = newKey(uavId);
        var row =
                keyRepository.findAll().stream()
                        .filter(k -> expired.substring(5, 13).equals(k.getKeyPrefix()))
                        .findFirst()
                        .orElseThrow();
        row.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        keyRepository.save(row);
        mvc.perform(telemetry(uavId, expired)).andExpect(status().isUnauthorized());
    }

    @Test
    void keyBoundToAnotherUavIsForbidden() throws Exception {
        String key = newKey(uavId);
        mvc.perform(telemetry(otherUavId, key)).andExpect(status().isForbidden());
        String unbound = newKey(null);
        mvc.perform(telemetry(otherUavId, unbound)).andExpect(status().isCreated());
    }

    @Test
    void adminCreateReturnsKeyOnceAndListNeverDoes() throws Exception {
        String created =
                mvc.perform(
                                post("/api/v1/admin/device-keys")
                                        .with(authentication(adminAuth()))
                                        .with(csrf())
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                "{\"name\":\"Station A\",\"uavId\":" + uavId + "}"))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.secret").exists())
                        .andExpect(jsonPath("$.key.uavId").value(uavId))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        String secret = created.replaceAll("(?s).*\"secret\":\"([^\"]+)\".*", "$1");
        String list =
                mvc.perform(get("/api/v1/admin/device-keys").with(authentication(adminAuth())))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertFalse(list.contains(secret));
        assertFalse(list.contains("keyHash"));
        assertTrue(list.contains("Station A"));
    }

    @Test
    void publicSiteInfoIsAnonymousAndOnlyExposesPublicSettings() throws Exception {
        String s = UUID.randomUUID().toString().substring(0, 6);
        settings.findByConfigKey("contact.dispatch_hotline").ifPresent(settings::delete);
        settings.save(
                SystemConfigurationOperations.createTyped(
                        "contact.dispatch_hotline",
                        "1900 1234",
                        "CONTACT",
                        SettingValueType.PHONE,
                        null,
                        null,
                        null,
                        true));
        settings.save(
                SystemConfigurationOperations.createTyped(
                        "private.secret_" + s,
                        "do-not-leak",
                        "OPERATIONS",
                        SettingValueType.STRING,
                        null,
                        null,
                        null,
                        false));
        settings.save(
                SystemConfigurationOperations.createTyped(
                        "contact.blank_" + s,
                        "",
                        "CONTACT",
                        SettingValueType.STRING,
                        null,
                        null,
                        null,
                        true));
        String body =
                mvc.perform(get("/api/v1/public/site-info"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.dispatchHotline").value("1900 1234"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        assertFalse(body.contains("do-not-leak"));
        assertFalse(body.contains("private.secret_"));
        assertFalse(body.contains("contact.blank_" + s));
        mvc.perform(post("/api/v1/public/site-info").with(csrf()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void settingsHistoryEndpointListsChanges() throws Exception {
        String key = "uav.test_threshold_" + UUID.randomUUID().toString().substring(0, 6);
        settings.save(
                SystemConfigurationOperations.createTyped(
                        key,
                        "10",
                        "SAFETY",
                        SettingValueType.INTEGER,
                        java.math.BigDecimal.ONE,
                        java.math.BigDecimal.valueOf(50),
                        null,
                        false));
        mvc.perform(
                        put("/api/v1/settings/" + key)
                                .with(authentication(adminAuth()))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"configValue\":\"99\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SETTING_OUT_OF_RANGE"));
        mvc.perform(
                        put("/api/v1/settings/" + key)
                                .with(authentication(adminAuth()))
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"configValue\":\"20\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valueType").value("INTEGER"));
        mvc.perform(get("/api/v1/settings/" + key + "/history").with(authentication(adminAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].oldValue").value("10"))
                .andExpect(jsonPath("$[0].newValue").value("20"))
                .andExpect(jsonPath("$[0].changedBy").value(admin.getUsername()));
    }
}
