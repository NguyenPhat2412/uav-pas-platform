package com.uav.platform.modules.auth.service;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.request.LoginRequest;
import com.uav.platform.modules.auth.dto.request.RefreshTokenRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;
import java.util.concurrent.*;

/** Real transactions and separate threads; credentials and token values never appear in assertion output. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:auth_concurrency;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class AuthConcurrencyIntegrationTest {
    @Autowired AuthService auth;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired InvalidatedTokenService invalidated;
    @Autowired JwtTokenProvider jwt;
    @Autowired JdbcTemplate db;
    @Autowired PlatformTransactionManager transactions;
    private AppUser user;
    private String password;

    @BeforeEach
    void fixture() {
        password = UUID.randomUUID().toString();
        user = newUser();
    }

    private AppUser newUser() {
        String name = "race_" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);
        AppUser account =
                new AppUser(
                        name,
                        name + "@example.invalid",
                        passwords.encode(password),
                        null,
                        UserStatus.ACTIVE);
        // New accounts start unverified; this fixture stands for a verified account.
        account.setEmailVerified(true);
        return users.save(account);
    }

    @Test
    void simultaneousFirstLoginByUsernameAndEmailBothSucceedWithOneCurrentRefresh()
            throws Exception {
        for (int round = 0; round < 3; round++) {
            if (round > 0) user = newUser();
            var results = race(() -> login(user.getUsername()), () -> login(user.getEmail()));
            assertStatuses(results, 200, 200);
            assertSingleCurrentRefresh(results, user.getId());
        }
    }

    @Test
    void simultaneousLoginReplacingAnExistingSessionBothSucceed() throws Exception {
        var old = login(user.getUsername());
        var results = race(() -> login(user.getUsername()), () -> login(user.getEmail()));
        assertStatuses(results, 200, 200);
        assertSingleCurrentRefresh(results, user.getId());
        assertEquals(401, outcome(() -> refresh(old)).status());
        assertFalse(
                invalidated.isInvalidated(old.accessToken()),
                "Login replacement does not globally revoke old access tokens");
    }

    @Test
    void simultaneousRefreshConsumesTheOldTokenOnlyOnce() throws Exception {
        var old = login(user.getUsername());
        var results = race(() -> refresh(old), () -> refresh(old));
        assertStatuses(results, 200, 401);
        assertSingleCurrentRefresh(results, user.getId());
        assertEquals(401, outcome(() -> refresh(old)).status());
    }

    @Test
    void loginRacingOldRefreshAlwaysLeavesTheLoginRefreshCurrent() throws Exception {
        var old = login(user.getUsername());
        var results = race(() -> login(user.getEmail()), () -> refresh(old));
        assertEquals(200, results.get(0).status());
        assertTrue(Set.of(200, 401).contains(results.get(1).status()));
        assertTrue(
                isCurrent(results.get(0).response().refreshToken(), user.getId()),
                "Later login replaces the old-session refresh regardless of race order");
        assertEquals(401, outcome(() -> refresh(old)).status());
    }

    @Test
    void duplicateLogoutOfSamePairIsIdempotentAndRevokesExactlyOnce() throws Exception {
        var session = login(user.getUsername());
        var results =
                race(
                        () -> logout(session.accessToken(), session.refreshToken()),
                        () -> logout(session.accessToken(), session.refreshToken()));
        assertStatuses(results, 200, 200);
        assertTrue(invalidated.isInvalidated(session.accessToken()));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM invalidated_tokens WHERE token_id=?",
                        Integer.class,
                        jwt.getTokenIdFromToken(session.accessToken())));
        assertEquals(401, outcome(() -> refresh(session)).status());
    }

    @Test
    void duplicateAccessOnlyLogoutIsIdempotent() throws Exception {
        var session = login(user.getUsername());
        assertStatuses(
                race(
                        () -> logout(session.accessToken(), null),
                        () -> logout(session.accessToken(), null)),
                200,
                200);
        assertTrue(invalidated.isInvalidated(session.accessToken()));
        assertEquals(
                200,
                outcome(() -> refresh(session)).status(),
                "Access-only logout preserves the refresh supplied by no request");
    }

    @Test
    void duplicateRefreshOnlyLogoutIsIdempotent() throws Exception {
        var session = login(user.getUsername());
        assertStatuses(
                race(
                        () -> logout(null, session.refreshToken()),
                        () -> logout(null, session.refreshToken())),
                200,
                200);
        assertEquals(401, outcome(() -> refresh(session)).status());
        assertFalse(invalidated.isInvalidated(session.accessToken()));
    }

    @Test
    void logoutRacingRefreshPreservesExactTokenScope() throws Exception {
        var old = login(user.getUsername());
        var results = race(() -> logout(old.accessToken(), old.refreshToken()), () -> refresh(old));
        assertEquals(200, results.get(0).status());
        assertTrue(Set.of(200, 401).contains(results.get(1).status()));
        assertTrue(invalidated.isInvalidated(old.accessToken()));
        assertEquals(401, outcome(() -> refresh(old)).status());
        if (results.get(1).status() == 200) {
            assertTrue(
                    isCurrent(results.get(1).response().refreshToken(), user.getId()),
                    "Logout of consumed old token must not revoke the new pair");
            assertFalse(invalidated.isInvalidated(results.get(1).response().accessToken()));
        }
    }

    @Test
    void staleLogoutAfterReloginCannotRevokeTheNewRefresh() {
        var old = login(user.getUsername());
        var current = login(user.getUsername());
        logout(old.accessToken(), old.refreshToken());
        assertTrue(isCurrent(current.refreshToken(), user.getId()));
        assertFalse(invalidated.isInvalidated(current.accessToken()));
        assertEquals(200, outcome(() -> refresh(current)).status());
    }

    @Test
    void crossedAccessAndRefreshOwnersDoNotDeadlockOrChangeLogoutScope() throws Exception {
        var other = newUser();
        var first = login(user.getUsername());
        var second = login(other.getUsername());
        assertStatuses(
                race(
                        () -> logout(first.accessToken(), second.refreshToken()),
                        () -> logout(second.accessToken(), first.refreshToken())),
                200,
                200);
        assertTrue(invalidated.isInvalidated(first.accessToken()));
        assertTrue(invalidated.isInvalidated(second.accessToken()));
        assertEquals(401, outcome(() -> refresh(first)).status());
        assertEquals(401, outcome(() -> refresh(second)).status());
    }

    @Test
    void unrelatedAccountCanLoginWhileAnotherUsersTransactionIsLocked() throws Exception {
        var other = newUser();
        var held = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(3);
        try {
            var blocker =
                    pool.submit(
                            () ->
                                    new TransactionTemplate(transactions)
                                            .execute(
                                                    s -> {
                                                        users.findByIdForUpdate(user.getId())
                                                                .orElseThrow();
                                                        held.countDown();
                                                        try {
                                                            assertTrue(
                                                                    release.await(
                                                                            15, TimeUnit.SECONDS));
                                                        } catch (InterruptedException e) {
                                                            throw new RuntimeException(e);
                                                        }
                                                        return null;
                                                    }));
            assertTrue(held.await(5, TimeUnit.SECONDS));
            var blocked = pool.submit(() -> outcome(() -> login(user.getUsername())));
            var independent = pool.submit(() -> outcome(() -> login(other.getUsername())));
            assertEquals(200, independent.get(5, TimeUnit.SECONDS).status());
            assertFalse(blocked.isDone());
            release.countDown();
            assertEquals(200, blocked.get(10, TimeUnit.SECONDS).status());
            blocker.get(10, TimeUnit.SECONDS);
        } finally {
            release.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void invalidAndExpiredRefreshRemainUnauthorizedWithoutIssuingReplacement() {
        assertEquals(
                401,
                outcome(
                                () ->
                                        auth.refreshToken(
                                                new RefreshTokenRequest(
                                                        UUID.randomUUID().toString())))
                        .status());
        var session = login(user.getUsername());
        db.update(
                "UPDATE refresh_tokens SET expiry_date=? WHERE user_id=?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(10)),
                user.getId());
        assertEquals(401, outcome(() -> refresh(session)).status());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM refresh_tokens WHERE user_id=?",
                        Integer.class,
                        user.getId()));
    }

    @Test
    void incorrectPasswordAndInactiveStatusKeepExistingResponses() {
        assertEquals(
                401,
                outcome(() -> auth.login(new LoginRequest(user.getUsername(), "wrong-" + password)))
                        .status());
        db.update("UPDATE users SET status='INACTIVE' WHERE id=?", user.getId());
        assertEquals(400, outcome(() -> login(user.getUsername())).status());
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT count(*) FROM refresh_tokens WHERE user_id=?",
                        Integer.class,
                        user.getId()));
    }

    @Test
    void concurrentWrongPasswordsPreserveFailedAttemptCountAndLockout() throws Exception {
        var gate = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(5);
        try {
            var attempts = new ArrayList<Future<Outcome>>();
            for (int i = 0; i < 5; i++)
                attempts.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    return outcome(
                                            () ->
                                                    auth.login(
                                                            new LoginRequest(
                                                                    user.getUsername(),
                                                                    "wrong-" + password)));
                                }));
            gate.countDown();
            for (var attempt : attempts)
                assertEquals(401, attempt.get(20, TimeUnit.SECONDS).status());
            assertEquals(
                    5,
                    db.queryForObject(
                            "SELECT failed_attempts FROM users WHERE id=?",
                            Integer.class,
                            user.getId()));
            assertEquals(401, outcome(() -> login(user.getUsername())).status());
            assertEquals(
                    0,
                    db.queryForObject(
                            "SELECT count(*) FROM refresh_tokens WHERE user_id=?",
                            Integer.class,
                            user.getId()));
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void emptyLogoutStillSucceeds() {
        assertEquals(200, outcome(() -> logout(null, null)).status());
    }

    @Test
    void successfulLoginPersistsResetAttemptsBeforeNestedRefreshCreation() {
        for (int i = 0; i < 3; i++)
            assertEquals(
                    401,
                    outcome(
                                    () ->
                                            auth.login(
                                                    new LoginRequest(
                                                            user.getUsername(),
                                                            "wrong-" + password)))
                            .status());
        assertEquals(
                3,
                db.queryForObject(
                        "SELECT failed_attempts FROM users WHERE id=?",
                        Integer.class,
                        user.getId()));
        assertEquals(200, outcome(() -> login(user.getUsername())).status());
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT failed_attempts FROM users WHERE id=?",
                        Integer.class,
                        user.getId()));
        assertNull(
                db.queryForObject(
                        "SELECT lock_time FROM users WHERE id=?",
                        java.sql.Timestamp.class,
                        user.getId()));
    }

    @Test
    void expiredTemporaryLockResetSurvivesNestedUserRefresh() {
        db.update(
                "UPDATE users SET failed_attempts=5,lock_time=? WHERE id=?",
                java.sql.Timestamp.valueOf(java.time.LocalDateTime.now().minusMinutes(16)),
                user.getId());
        assertEquals(200, outcome(() -> login(user.getUsername())).status());
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT failed_attempts FROM users WHERE id=?",
                        Integer.class,
                        user.getId()));
        assertNull(
                db.queryForObject(
                        "SELECT lock_time FROM users WHERE id=?",
                        java.sql.Timestamp.class,
                        user.getId()));
    }

    private AuthResponse login(String identity) {
        return auth.login(new LoginRequest(identity, password));
    }

    private AuthResponse refresh(AuthResponse response) {
        return auth.refreshToken(new RefreshTokenRequest(response.refreshToken()));
    }

    private AuthResponse logout(String access, String refresh) {
        auth.logout(access, refresh);
        return null;
    }

    private boolean isCurrent(String token, Long owner) {
        return db.queryForObject(
                        "SELECT count(*) FROM refresh_tokens WHERE user_id=? AND token=? AND revoked=false",
                        Integer.class,
                        owner,
                        token)
                == 1;
    }

    private void assertSingleCurrentRefresh(List<Outcome> results, Long owner) {
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM refresh_tokens WHERE user_id=? AND revoked=false",
                        Integer.class,
                        owner));
        assertEquals(
                1,
                results.stream()
                        .filter(
                                x ->
                                        x.status() == 200
                                                && x.response() != null
                                                && isCurrent(x.response().refreshToken(), owner))
                        .count());
    }

    private void assertStatuses(List<Outcome> results, Integer... expected) {
        assertEquals(
                Arrays.stream(expected).sorted().toList(),
                results.stream().map(Outcome::status).sorted().toList());
    }

    private record Outcome(int status, AuthResponse response) {}

    private Outcome outcome(Callable<AuthResponse> action) {
        try {
            return new Outcome(200, action.call());
        } catch (SystemException ex) {
            return new Outcome(ex.getStatus().value(), null);
        } catch (Exception ex) {
            return new Outcome(500, null);
        }
    }

    private List<Outcome> race(Callable<AuthResponse> a, Callable<AuthResponse> b)
            throws Exception {
        var gate = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var first =
                    pool.submit(
                            () -> {
                                gate.await();
                                return outcome(a);
                            });
            var second =
                    pool.submit(
                            () -> {
                                gate.await();
                                return outcome(b);
                            });
            gate.countDown();
            return List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }
}
