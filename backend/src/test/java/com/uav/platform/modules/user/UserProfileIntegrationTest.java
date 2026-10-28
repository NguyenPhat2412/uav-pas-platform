package com.uav.platform.modules.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.WebApplicationContext;

import tools.jackson.databind.ObjectMapper;

import java.util.*;
import java.util.concurrent.*;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_profile;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class UserProfileIntegrationTest {
    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @Autowired PlatformTransactionManager transactions;
    @MockitoSpyBean AuditLogService audit;
    MockMvc mvc;
    AppUser a, b;
    static final String URL = "/api/v1/users/profile";

    @BeforeEach
    void fixture() {
        mvc =
                MockMvcBuilders.webAppContextSetup(context)
                        .defaultRequest(
                                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                        .get("/")
                                        .with(
                                                org.springframework.security.test.web.servlet
                                                        .request
                                                        .SecurityMockMvcRequestPostProcessors
                                                        .csrf()))
                        .apply(springSecurity())
                        .build();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        a = user("profile_a_" + suffix);
        b = user("profile_b_" + suffix);
    }

    AppUser user(String name) {
        var user =
                new AppUser(
                        name, name + "@example.invalid", "synthetic-hash", null, UserStatus.ACTIVE);
        user.setFullName("Tên ban đầu");
        return users.save(user);
    }

    org.springframework.test.web.servlet.request.RequestPostProcessor as(AppUser user) {
        return authentication(
                new UsernamePasswordAuthenticationToken(user.getUsername(), null, List.of()));
    }

    Map<String, Object> read(AppUser user) throws Exception {
        var result = mvc.perform(get(URL).with(as(user))).andExpect(status().isOk()).andReturn();
        return json.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    Map<String, Object> body(AppUser user, String name, String phone) throws Exception {
        return new HashMap<>(
                Map.of(
                        "fullName",
                        name,
                        "phoneNumber",
                        phone,
                        "expectedRevision",
                        read(user).get("revision")));
    }

    MvcResult update(AppUser user, Map<String, Object> body, int expected) throws Exception {
        return mvc.perform(
                        patch(URL)
                                .with(as(user))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(body)))
                .andExpect(status().is(expected))
                .andReturn();
    }

    String phone() {
        // A valid Vietnamese mobile number (10 digits), unique enough per test run.
        return "09"
                + String.format(
                        "%08d",
                        Math.floorMod(UUID.randomUUID().getLeastSignificantBits(), 100_000_000L));
    }

    Map<String, Object> protectedFields(AppUser user) {
        return db.queryForMap(
                "select username,email,password_hash,role,status,failed_attempts,manual_locked,lock_time,zalo_id,avatar_url from users where id=?",
                user.getId());
    }

    long audits() {
        return db.queryForObject(
                "select count(*) from audit_logs where entity_type='USER_PROFILE' and entity_id=?",
                Long.class,
                a.getId().toString());
    }

    @Test
    void selfUpdateTrimsOnlyApprovedFieldsAndIsVisibleOnRead() throws Exception {
        var before = protectedFields(a);
        var other = read(b);
        String number = phone();
        var result = update(a, body(a, "  Nguyễn Xuân Phát  ", " " + number + " "), 200);
        var response = json.readValue(result.getResponse().getContentAsString(), Map.class);
        assertEquals(a.getId().intValue(), response.get("id"));
        assertEquals("Nguyễn Xuân Phát", response.get("fullName"));
        assertEquals(number, response.get("phoneNumber"));
        assertEquals(response, read(a));
        assertEquals(other, read(b));
        assertEquals(before, protectedFields(a));
        assertEquals(1, audits());
        String details =
                db.queryForObject(
                        "select details from audit_logs where entity_type='USER_PROFILE' and entity_id=?",
                        String.class,
                        a.getId().toString());
        assertTrue(details.contains("fullName"));
        assertTrue(details.contains("phoneNumber"));
        assertFalse(details.contains(number));
        assertFalse(details.contains("Phát"));
    }

    @Test
    void anonymousCannotReadOrWrite() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        mvc.perform(patch(URL).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forgedIdentityAndPrivilegedFieldsAreRejectedWithoutWrites() throws Exception {
        var before = protectedFields(a);
        var profile = read(a);
        for (String field :
                List.of(
                        "id",
                        "userId",
                        "username",
                        "email",
                        "password",
                        "passwordHash",
                        "role",
                        "status",
                        "avatarUrl",
                        "permissions")) {
            var request = body(a, "Forged", phone());
            request.put(field, b.getId());
            update(a, request, 400);
        }
        assertEquals(before, protectedFields(a));
        assertEquals(profile, read(a));
        assertEquals(0, audits());
    }

    @Test
    void invalidValuesAreRejectedBeforeAnyWrite() throws Exception {
        var before = read(a);
        var valid = body(a, "Name", phone());
        for (var entry :
                Map.of(
                                "fullName",
                                "x".repeat(101),
                                "phoneNumber",
                                "x".repeat(21),
                                "expectedRevision",
                                "bad")
                        .entrySet()) {
            var request = new HashMap<>(valid);
            request.put(entry.getKey(), entry.getValue());
            update(a, request, 400);
        }
        for (Object number : List.of("", "   ", 123)) {
            var request = new HashMap<>(valid);
            request.put("phoneNumber", number);
            update(a, request, 400);
        }
        var missing = new HashMap<>(valid);
        missing.remove("expectedRevision");
        update(a, missing, 400);
        assertEquals(before, read(a));
        assertEquals(0, audits());
    }

    @Test
    void optionalNameCanBeClearedAndNoOpDoesNotCreateAudit() throws Exception {
        String number = phone();
        update(a, body(a, "   ", number), 200);
        assertNull(read(a).get("fullName"));
        long count = audits();
        var request = body(a, "", number);
        request.put("fullName", null);
        update(a, request, 200);
        assertEquals(count, audits());
    }

    @Test
    void duplicatePhoneDoesNotChangeProfile() throws Exception {
        String number = phone();
        update(b, body(b, "B", number), 200);
        var before = read(a);
        update(a, body(a, "A", number), 409);
        assertEquals(before, read(a));
        assertEquals(0, audits());
    }

    @Test
    void staleTabAndAnotherAccountsRevisionCannotOverwrite() throws Exception {
        var stale = body(a, "Old tab", phone());
        var wrong = body(b, "B", phone());
        update(a, wrong, 409);
        update(a, body(a, "First tab", phone()), 200);
        var saved = read(a);
        update(a, stale, 409);
        assertEquals(saved, read(a));
        assertEquals(1, audits());
    }

    @Test
    void concurrentUpdatesHaveExactlyOneWinner() throws Exception {
        var left = body(a, "Left", phone());
        var right = new HashMap<>(left);
        right.put("fullName", "Right");
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            Callable<Integer> l =
                    () -> {
                        start.await();
                        return rawUpdate(a, left);
                    };
            Callable<Integer> r =
                    () -> {
                        start.await();
                        return rawUpdate(a, right);
                    };
            var one = pool.submit(l);
            var two = pool.submit(r);
            start.countDown();
            var statuses =
                    new ArrayList<>(
                            List.of(one.get(15, TimeUnit.SECONDS), two.get(15, TimeUnit.SECONDS)));
            Collections.sort(statuses);
            assertEquals(List.of(200, 409), statuses);
            assertEquals(1, audits());
        }
    }

    int rawUpdate(AppUser user, Map<String, Object> body) throws Exception {
        return mvc.perform(
                        patch(URL)
                                .with(as(user))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json.writeValueAsString(body)))
                .andReturn()
                .getResponse()
                .getStatus();
    }

    @Test
    void concurrentAccountsCannotClaimSamePhone() throws Exception {
        String number = phone();
        var first = body(a, "First", number);
        var second = body(b, "Second", number);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            var one =
                    pool.submit(
                            () -> {
                                start.await();
                                return rawUpdate(a, first);
                            });
            var two =
                    pool.submit(
                            () -> {
                                start.await();
                                return rawUpdate(b, second);
                            });
            start.countDown();
            var statuses =
                    new ArrayList<>(
                            List.of(one.get(15, TimeUnit.SECONDS), two.get(15, TimeUnit.SECONDS)));
            Collections.sort(statuses);
            assertEquals(List.of(200, 409), statuses);
            assertEquals(
                    1,
                    db.queryForObject(
                            "select count(*) from users where phone_number=?",
                            Integer.class,
                            number));
        }
    }

    @Test
    void malformedJsonAndMissingFieldsAreBadRequests() throws Exception {
        for (String raw : List.of("{", "null", "[]", "{}", "{\"phoneNumber\":null}"))
            mvc.perform(patch(URL).with(as(a)).contentType(MediaType.APPLICATION_JSON).content(raw))
                    .andExpect(status().isBadRequest());
        assertEquals(0, audits());
    }

    @Test
    void lockedOrInactiveAccountCannotWriteEvenWithExistingAuthentication() throws Exception {
        var request = body(a, "Locked", phone());
        db.update("update users set manual_locked=true where id=?", a.getId());
        update(a, request, 403);
        db.update("update users set manual_locked=false,status='SUSPENDED' where id=?", a.getId());
        update(a, request, 403);
        assertEquals(0, audits());
    }

    @Test
    void auditFailureRollsBackProfile() throws Exception {
        var before = read(a);
        var request = body(a, "Rollback", phone());
        doThrow(new IllegalStateException("Synthetic audit failure"))
                .when(audit)
                .record(
                        eq(a.getId()),
                        anyString(),
                        any(),
                        eq("USER_PROFILE"),
                        anyString(),
                        anyString());
        try {
            update(a, request, 409);
        } finally {
            reset(audit);
        }
        assertEquals(before, read(a));
        assertEquals(0, audits());
    }

    @Test
    void concurrentAdministrativeUpdateDoesNotRestoreOldProfile() throws Exception {
        var request = body(a, "New profile", phone());
        var loaded = new CountDownLatch(1);
        var saved = new CountDownLatch(1);
        try (var pool = Executors.newSingleThreadExecutor()) {
            var admin =
                    pool.submit(
                            () ->
                                    new TransactionTemplate(transactions)
                                            .execute(
                                                    status -> {
                                                        var stale =
                                                                users.findById(a.getId())
                                                                        .orElseThrow();
                                                        loaded.countDown();
                                                        try {
                                                            assertTrue(
                                                                    saved.await(
                                                                            15, TimeUnit.SECONDS));
                                                        } catch (InterruptedException e) {
                                                            throw new RuntimeException(e);
                                                        }
                                                        stale.setRole(UserRole.ROLE_OPERATOR);
                                                        stale.setManualLocked(true);
                                                        users.saveAndFlush(stale);
                                                        return null;
                                                    }));
            assertTrue(loaded.await(10, TimeUnit.SECONDS));
            try {
                update(a, request, 200);
            } finally {
                saved.countDown();
            }
            admin.get(15, TimeUnit.SECONDS);
        }
        var account = users.findById(a.getId()).orElseThrow();
        assertEquals("New profile", account.getFullName());
        assertEquals(UserRole.ROLE_OPERATOR, account.getRole());
        assertTrue(account.isManualLocked());
    }
}
