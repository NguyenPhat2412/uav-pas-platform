package com.uav.platform.service.permission;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.role.RoleTemplatePermissionRepository;
import com.uav.platform.repository.user.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.net.URI;
import java.net.http.*;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Phase1AccessIntegrationTest {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired RoleTemplatePermissionRepository templatePermissions;
    final ObjectMapper json = new ObjectMapper();
    final HttpClient http = HttpClient.newHttpClient();
    AppUser admin, pilot;
    String adminToken, pilotToken;

    @BeforeEach
    void seedUsers() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        admin =
                users.save(
                        new AppUser(
                                "admin_" + suffix,
                                "admin_" + suffix + "@test.vn",
                                encoder.encode("Secret123!"),
                                null,
                                null,
                                null,
                                null,
                                UserRole.ROLE_ADMIN,
                                UserStatus.ACTIVE));
        pilot =
                users.save(
                        new AppUser(
                                "pilot_" + suffix,
                                "pilot_" + suffix + "@test.vn",
                                encoder.encode("Secret123!"),
                                null,
                                UserStatus.ACTIVE));
        // New accounts start unverified; these fixtures stand for verified accounts.
        admin.setEmailVerified(true);
        pilot.setEmailVerified(true);
        admin = users.save(admin);
        pilot = users.save(pilot);
        adminToken = login(admin);
        pilotToken = login(pilot);
        request(
                "PUT",
                "/api/v1/role-templates/ROLE_PILOT/permissions/STATION_MANAGE?granted=false",
                adminToken,
                null);
        request(
                "PUT",
                "/api/v1/role-templates/ROLE_PILOT/permissions/STATION_READ?granted=true",
                adminToken,
                null);
    }

    @Test
    void currentPermissionsReflectGrantDenyAndResetOnExistingToken() throws Exception {
        assertEquals(401, request("GET", "/api/v1/permissions/me", null, null).statusCode());
        var initial = request("GET", "/api/v1/permissions/me", pilotToken, null);
        assertEquals(200, initial.statusCode(), initial.body());
        assertTrue(json.readTree(initial.body()).toString().contains("\"STATION_READ\""));
        request(
                "PUT",
                "/api/v1/permissions/users/" + pilot.getId() + "/STATION_READ?granted=false",
                adminToken,
                null);
        assertFalse(
                json.readTree(request("GET", "/api/v1/permissions/me", pilotToken, null).body())
                        .toString()
                        .contains("\"STATION_READ\""));
        request(
                "DELETE",
                "/api/v1/permissions/users/" + pilot.getId() + "/STATION_READ",
                adminToken,
                null);
        assertTrue(
                json.readTree(request("GET", "/api/v1/permissions/me", pilotToken, null).body())
                        .toString()
                        .contains("\"STATION_READ\""));
    }

    @Test
    void permissionDenialIsForbiddenAndGrantAppliesWithoutRelogin() throws Exception {
        String body = "{\"code\":\"ST-" + UUID.randomUUID() + "\",\"name\":\"Test station\"}";
        assertEquals(403, request("POST", "/api/v1/stations", pilotToken, body).statusCode());
        assertEquals(
                204,
                request(
                                "PUT",
                                "/api/v1/permissions/users/"
                                        + pilot.getId()
                                        + "/STATION_MANAGE?granted=true",
                                adminToken,
                                null)
                        .statusCode());
        assertEquals(201, request("POST", "/api/v1/stations", pilotToken, body).statusCode());
        assertEquals(
                204,
                request(
                                "PUT",
                                "/api/v1/permissions/users/"
                                        + pilot.getId()
                                        + "/STATION_MANAGE?granted=false",
                                adminToken,
                                null)
                        .statusCode());
        assertEquals(403, request("POST", "/api/v1/stations", pilotToken, body).statusCode());
    }

    @Test
    void manualLockRejectsExistingJwtAndUnlockRestoresLogin() throws Exception {
        assertEquals(
                204,
                request("POST", "/api/v1/users/" + pilot.getId() + "/lock", adminToken, null)
                        .statusCode());
        assertEquals(401, request("GET", "/api/v1/auth/me", pilotToken, null).statusCode());
        assertEquals(
                401, request("POST", "/api/v1/auth/login", null, loginBody(pilot)).statusCode());
        assertEquals(
                204,
                request("POST", "/api/v1/users/" + pilot.getId() + "/unlock", adminToken, null)
                        .statusCode());
        assertEquals(
                200, request("POST", "/api/v1/auth/login", null, loginBody(pilot)).statusCode());
    }

    @Test
    void demotedAdminCannotUseStaleJwtToManagePermissions() throws Exception {
        assertEquals(
                200,
                request(
                                "PUT",
                                "/api/v1/users/" + admin.getId() + "/role",
                                adminToken,
                                "{\"role\":\"ROLE_PILOT\"}")
                        .statusCode());
        assertEquals(
                403,
                request(
                                "PUT",
                                "/api/v1/permissions/users/"
                                        + pilot.getId()
                                        + "/STATION_MANAGE?granted=true",
                                adminToken,
                                null)
                        .statusCode());
    }

    @Test
    void roleTemplateGrantReachesUsersWithoutDirectOverride() throws Exception {
        String body =
                "{\"code\":\"ST-TMP-"
                        + UUID.randomUUID().toString().substring(0, 8)
                        + "\",\"name\":\"Template station\"}";
        assertEquals(
                204,
                request(
                                "PUT",
                                "/api/v1/role-templates/ROLE_PILOT/permissions/STATION_MANAGE?granted=true",
                                adminToken,
                                null)
                        .statusCode());
        assertEquals(201, request("POST", "/api/v1/stations", pilotToken, body).statusCode());
        assertEquals(
                204,
                request(
                                "PUT",
                                "/api/v1/role-templates/ROLE_PILOT/permissions/STATION_MANAGE?granted=false",
                                adminToken,
                                null)
                        .statusCode());
    }

    @Test
    void revokingTemplateDefaultActuallyRemovesAccess() throws Exception {
        assertEquals(200, request("GET", "/api/v1/stations", pilotToken, null).statusCode());
        assertEquals(
                204,
                request(
                                "PUT",
                                "/api/v1/role-templates/ROLE_PILOT/permissions/STATION_READ?granted=false",
                                adminToken,
                                null)
                        .statusCode());
        assertEquals(403, request("GET", "/api/v1/stations", pilotToken, null).statusCode());
    }

    @Test
    void resettingUserOverrideRestoresTemplatePermission() throws Exception {
        assertEquals(
                204,
                request(
                                "PUT",
                                "/api/v1/permissions/users/"
                                        + pilot.getId()
                                        + "/STATION_READ?granted=false",
                                adminToken,
                                null)
                        .statusCode());
        assertEquals(403, request("GET", "/api/v1/stations", pilotToken, null).statusCode());
        assertEquals(
                204,
                request(
                                "DELETE",
                                "/api/v1/permissions/users/" + pilot.getId() + "/STATION_READ",
                                adminToken,
                                null)
                        .statusCode());
        assertEquals(200, request("GET", "/api/v1/stations", pilotToken, null).statusCode());
    }

    @Test
    void dashboardMetricsRespectPermissionVisibility() throws Exception {
        String dashboard = request("GET", "/api/v1/dashboard/summary", pilotToken, null).body();
        assertEquals(0, json.readTree(dashboard).path("totalUsers").asInt());
    }

    @Test
    void repeatedBadPasswordsPersistLockAcrossRequests() throws Exception {
        for (int i = 0; i < 5; i++) {
            assertEquals(
                    401,
                    request(
                                    "POST",
                                    "/api/v1/auth/login",
                                    null,
                                    "{\"usernameOrEmail\":\""
                                            + pilot.getUsername()
                                            + "\",\"password\":\"wrong\"}")
                            .statusCode());
        }
        assertEquals(5, users.findById(pilot.getId()).orElseThrow().getFailedAttempts());
        assertEquals(
                401, request("POST", "/api/v1/auth/login", null, loginBody(pilot)).statusCode());
    }

    String loginBody(AppUser user) {
        return "{\"usernameOrEmail\":\"" + user.getUsername() + "\",\"password\":\"Secret123!\"}";
    }

    String login(AppUser user) throws Exception {
        HttpResponse<String> response =
                request("POST", "/api/v1/auth/login", null, loginBody(user));
        assertEquals(200, response.statusCode(), response.body());
        return json.readTree(response.body()).path("accessToken").asText();
    }

    HttpResponse<String> request(String method, String path, String token, String body)
            throws Exception {
        var builder =
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                        .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(
                builder.method(
                                method,
                                body == null
                                        ? HttpRequest.BodyPublishers.noBody()
                                        : HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }
}
