package com.uav.platform.integration.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.dto.request.mission.MissionCreateRequest;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.mission.MissionService;
import com.uav.platform.support.ServicePlanTestData;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/** HTTP requests commit independently: stale sequential tabs and actual database contention. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:draft_concurrency;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;LOCK_TIMEOUT=10000")
class MissionDraftConcurrencyIntegrationTest {
    @Autowired ServicePlanRepository servicePlans;
    @Autowired MissionService missions;
    @Autowired UserRepository users;
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate db;
    @MockitoSpyBean AuditLogService audit;
    private MockMvc mvc;
    private AppUser customer, other;
    private Long id;
    private LocalDateTime start;

    @BeforeEach
    void fixture() {
        ServicePlanTestData.ensureBasicPlan(servicePlans);
        customer = user();
        other = user();
        start = LocalDateTime.now().plusDays(3).withNano(0);
        id =
                missions.create(
                                new MissionCreateRequest(
                                        MissionType.AREA_INSPECTION,
                                        "Original draft",
                                        "Original description",
                                        start.toLocalDate(),
                                        start,
                                        start.plusHours(1),
                                        "Hanoi",
                                        null,
                                        null,
                                        null,
                                        MissionPriority.NORMAL,
                                        "Original notes"),
                                customer.getUsername())
                        .id();
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
    }

    @Test
    void oldTabCannotOverwriteAnAlreadyCommittedEditOrAppendHistory() throws Exception {
        long readVersion = version();
        assertEquals(200, edit(customer, "Saved by tab A", readVersion));
        var saved = snapshot();
        assertEquals(409, edit(customer, "Unsaved tab B", readVersion));
        assertEquals(saved, snapshot());
        assertEquals("Saved by tab A", title());
    }

    @Test
    void getAndPatchExposeTheCommittedVersionForTheNextEdit() throws Exception {
        long first = version();
        mvc.perform(get(path()).with(authentication(auth(customer))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(first));
        mvc.perform(
                        patch(path())
                                .with(authentication(auth(customer)))
                                .contentType("application/json")
                                .content(body("First edit", first)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(first + 1));
        assertEquals(first + 1, version());
        assertEquals(200, edit(customer, "Second edit after reload", version()));
        assertEquals("Second edit after reload", title());
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "null", "-1"})
    void missingOrInvalidVersionCannotBypassTheGuard(String value) throws Exception {
        var before = snapshot();
        String json =
                body("Bypass attempt", 0)
                        .replace(
                                "\"expectedVersion\":0,",
                                value.equals("missing")
                                        ? ""
                                        : "\"expectedVersion\":" + value + ",");
        mvc.perform(
                        patch(path())
                                .with(authentication(auth(customer)))
                                .contentType("application/json")
                                .content(json))
                .andExpect(status().isBadRequest());
        assertEquals(before, snapshot());
    }

    @Test
    void versionFromTheFutureIsRejectedWithoutMutation() throws Exception {
        var before = snapshot();
        assertEquals(409, edit(customer, "Future version", version() + 5));
        assertEquals(before, snapshot());
    }

    @Test
    void otherCustomerCannotEditEvenWithTheCorrectVersion() throws Exception {
        var before = snapshot();
        assertEquals(403, edit(other, "Other customer", version()));
        assertEquals(before, snapshot());
    }

    @Test
    void anonymousCannotReadOrEditDraft() throws Exception {
        mvc.perform(get(path())).andExpect(status().isUnauthorized());
        mvc.perform(
                        patch(path())
                                .contentType("application/json")
                                .content(body("Anonymous", version())))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"submit", "cancel"})
    void aDraftCannotBeEditedAfterLeavingDraftEvenWithTheLatestVersion(String action)
            throws Exception {
        assertEquals(200, transition(action));
        var before = snapshot();
        assertEquals(409, edit(customer, "Late edit", version()));
        assertEquals(before, snapshot());
    }

    @Test
    void twoConcurrentEditsFromOneSnapshotHaveExactlyOneWinner() throws Exception {
        long first = version();
        var statuses =
                race(
                        () -> edit(customer, "Concurrent A", first),
                        () -> edit(customer, "Concurrent B", first));
        assertEquals(List.of(200, 409), statuses.stream().sorted().toList());
        assertEquals(first + 1, version());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='UPDATED'",
                        Integer.class,
                        id));
        assertTrue(Set.of("Concurrent A", "Concurrent B").contains(title()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"submit", "cancel"})
    void editRacingWithTransitionNeverWritesAfterTheTransition(String action) throws Exception {
        long first = version();
        var statuses =
                race(
                        () -> edit(customer, "Edit racing transition", first),
                        () -> transition(action));
        assertEquals(200, statuses.get(1));
        assertTrue(Set.of(200, 409).contains(statuses.get(0)));
        assertEquals(
                action.equals("submit") ? "PENDING_CONFIRMATION" : "CANCELLED",
                db.queryForObject("SELECT status FROM missions WHERE id=?", String.class, id));
        assertEquals(statuses.get(0) == 200 ? "Edit racing transition" : "Original draft", title());
        var events =
                db.queryForList(
                        "SELECT event_type FROM mission_events WHERE mission_id=? ORDER BY id",
                        String.class,
                        id);
        assertEquals(action.equals("submit") ? "SUBMITTED" : "CANCELLED", events.getLast());
    }

    @Test
    void lostResponseRetryDoesNotAppendASecondUpdate() throws Exception {
        long first = version();
        assertEquals(200, edit(customer, "Committed before disconnect", first));
        var saved = snapshot();
        assertEquals(409, edit(customer, "Committed before disconnect", first));
        assertEquals(saved, snapshot());
    }

    @Test
    void auditFailureRollsBackDraftVersionContentAndTimeline() throws Exception {
        var before = snapshot();
        doThrow(new IllegalStateException("Synthetic audit failure"))
                .when(audit)
                .record(
                        isNull(),
                        eq(customer.getUsername()),
                        eq(AuditAction.UPDATE),
                        eq("MISSION"),
                        eq(id.toString()),
                        anyString());
        assertEquals(409, edit(customer, "Must roll back", version()));
        assertEquals(before, snapshot());
    }

    private int edit(AppUser actor, String title, long version) throws Exception {
        return mvc.perform(
                        patch(path())
                                .with(authentication(auth(actor)))
                                .contentType("application/json")
                                .content(body(title, version)))
                .andReturn()
                .getResponse()
                .getStatus();
    }

    private int transition(String action) throws Exception {
        return mvc.perform(post(path() + "/" + action).with(authentication(auth(customer))))
                .andReturn()
                .getResponse()
                .getStatus();
    }

    private String body(String title, long version) {
        return """
                {"expectedVersion":%d,"title":"%s","description":"Updated description","requestedDate":"%s",
                 "startTime":"%s","expectedEndTime":"%s","locationName":"Hanoi","priority":"HIGH","notes":"Updated notes"}
                """
                .formatted(version, title, start.toLocalDate(), start, start.plusHours(1));
    }

    private String path() {
        return "/api/v1/missions/" + id;
    }

    private long version() {
        return db.queryForObject("SELECT version FROM missions WHERE id=?", Long.class, id);
    }

    private String title() {
        return db.queryForObject("SELECT title FROM missions WHERE id=?", String.class, id);
    }

    private List<?> snapshot() {
        return List.of(
                db.queryForMap(
                        "SELECT title,description,status,notes,version,updated_at FROM missions WHERE id=?",
                        id),
                db.queryForObject(
                        "SELECT count(*) FROM mission_events WHERE mission_id=?",
                        Integer.class,
                        id),
                db.queryForObject(
                        "SELECT count(*) FROM audit_logs WHERE actor_username=?",
                        Integer.class,
                        customer.getUsername()));
    }

    private AppUser user() {
        String username = "draft_" + UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                new AppUser(
                        username,
                        username + "@example.invalid",
                        "fixture-placeholder",
                        null,
                        null,
                        null,
                        null,
                        UserRole.ROLE_PILOT,
                        UserStatus.ACTIVE));
    }

    private UsernamePasswordAuthenticationToken auth(AppUser actor) {
        return UsernamePasswordAuthenticationToken.authenticated(
                actor.getUsername(), "n/a", List.of());
    }

    private List<Integer> race(Callable<Integer> left, Callable<Integer> right) throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var gate = new CountDownLatch(1);
        try {
            var a =
                    pool.submit(
                            () -> {
                                gate.await();
                                return left.call();
                            });
            var b =
                    pool.submit(
                            () -> {
                                gate.await();
                                return right.call();
                            });
            gate.countDown();
            return List.of(a.get(25, TimeUnit.SECONDS), b.get(25, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }
}
