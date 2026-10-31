package com.uav.platform.integration.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

import com.uav.platform.dto.request.mission.MissionCreateRequest;
import com.uav.platform.dto.response.mission.MissionResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.mission.MissionService;
import com.uav.platform.support.ServicePlanTestData;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Every create runs in its own committed service transaction, without a test transaction. */
@SpringBootTest(
        properties = {
            "spring.datasource.url=jdbc:h2:mem:mission_code_concurrency;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;LOCK_TIMEOUT=15000",
            "spring.datasource.hikari.maximum-pool-size=16"
        })
class MissionCodeConcurrencyIntegrationTest {
    @Autowired ServicePlanRepository servicePlans;
    @Autowired MissionService missions;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    @MockitoSpyBean AuditLogService audit;
    private AppUser customer;

    @BeforeEach
    void customer() {
        ServicePlanTestData.ensureBasicPlan(servicePlans);
        String username = "code_" + UUID.randomUUID().toString().substring(0, 12);
        customer =
                users.save(
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

    @Test
    void simultaneousCreatesAllCommitWithDistinctCodesAndHistory() throws Exception {
        int count = 12;
        var ready = new CountDownLatch(count);
        var start = new CountDownLatch(1);
        var futures = new ArrayList<Future<MissionResponse>>();
        var results = new ArrayList<MissionResponse>();
        var failures = new ArrayList<Throwable>();
        var pool = Executors.newFixedThreadPool(count);
        try {
            for (int i = 0; i < count; i++) {
                String title = "Concurrent mission " + i;
                futures.add(
                        pool.submit(
                                () -> {
                                    ready.countDown();
                                    assertTrue(
                                            start.await(15, TimeUnit.SECONDS),
                                            "Start gate timed out");
                                    return missions.create(
                                            request(title, 2091), customer.getUsername());
                                }));
            }
            assertTrue(ready.await(15, TimeUnit.SECONDS), "Workers did not become ready");
            start.countDown();
            for (var future : futures) {
                try {
                    results.add(future.get(45, TimeUnit.SECONDS));
                } catch (java.util.concurrent.ExecutionException error) {
                    failures.add(error.getCause());
                }
            }
        } finally {
            start.countDown();
            pool.shutdownNow();
            assertTrue(pool.awaitTermination(15, TimeUnit.SECONDS), "Workers did not stop");
        }

        assertTrue(failures.isEmpty(), () -> "Valid creates must all succeed: " + failures);
        assertEquals(
                count, new HashSet<>(results.stream().map(MissionResponse::code).toList()).size());
        assertEquals(
                count,
                db.queryForObject(
                        "SELECT count(*) FROM missions WHERE customer_id=?",
                        Integer.class,
                        customer.getId()));
        for (var result : results) {
            assertTrue(result.code().matches("MSN-2091-[0-9]{6,}"), result.code());
            assertEquals(
                    result.code(),
                    db.queryForObject(
                            "SELECT code FROM missions WHERE id=?", String.class, result.id()));
            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='CREATED'",
                            Integer.class,
                            result.id()));
        }
    }

    @Test
    void failedCreateRollsBackMissionAndHistoryWithoutBreakingTheNextCreate() {
        doThrow(new IllegalStateException("Synthetic audit failure"))
                .when(audit)
                .record(
                        eq(customer.getId()),
                        eq(customer.getUsername()),
                        eq(AuditAction.CREATE),
                        eq("MISSION"),
                        anyString(),
                        anyString());
        assertThrows(
                IllegalStateException.class,
                () -> missions.create(request("Must roll back", 2092), customer.getUsername()));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT count(*) FROM missions WHERE customer_id=?",
                        Integer.class,
                        customer.getId()));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT count(*) FROM mission_events WHERE actor_id=?",
                        Integer.class,
                        customer.getId()));

        reset(audit);
        var saved = missions.create(request("After rollback", 2092), customer.getUsername());
        assertTrue(saved.code().matches("MSN-2092-[0-9]{6,}"), saved.code());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM missions WHERE customer_id=?",
                        Integer.class,
                        customer.getId()));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='CREATED'",
                        Integer.class,
                        saved.id()));
    }

    private MissionCreateRequest request(String title, int year) {
        var start = LocalDateTime.of(year, 6, 15, 9, 0);
        return new MissionCreateRequest(
                MissionType.AREA_INSPECTION,
                title,
                "Code allocation regression",
                start.toLocalDate(),
                start,
                start.plusHours(1),
                "Hanoi",
                null,
                null,
                null,
                MissionPriority.NORMAL,
                null);
    }
}
