package com.uav.platform.security.jwt;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.security.SessionRevocationService;

import jakarta.servlet.FilterChain;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.Optional;

/** Admin session revocation must make already-issued access tokens stop authenticating. */
class JwtSessionRevocationFilterTest {

    private final JwtTokenProvider provider =
            new JwtTokenProvider("filter-revocation-test-secret-32-bytes-min!!", 600_000L);
    private final UserRepository users = mock(UserRepository.class);
    private final SessionRevocationService revocations = mock(SessionRevocationService.class);
    private final FilterChain chain = mock(FilterChain.class);
    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setUsername("pilot");
        user.setRole(UserRole.ROLE_PILOT);
        user.setStatus(UserStatus.ACTIVE);
        when(users.findByUsername("pilot")).thenReturn(Optional.of(user));
        filter = new JwtAuthenticationFilter(provider, null, users, null);
        filter.setSessionRevocationService(revocations);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequest requestWith(String token) {
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    @Test
    void revokedTokenDoesNotAuthenticate() throws Exception {
        String token = provider.generateToken(7L, "pilot", "p@x.vn", "ROLE_PILOT");
        when(revocations.isRevoked(eq(7L), any(Instant.class))).thenReturn(true);
        var request = requestWith(token);

        filter.doFilterInternal(request, new MockHttpServletResponse(), chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(eq(request), any());
    }

    @Test
    void tokenNotRevokedStillAuthenticatesAndPassesIssuedAt() throws Exception {
        Instant before = Instant.now().minusSeconds(2);
        String token = provider.generateToken(7L, "pilot", "p@x.vn", "ROLE_PILOT");
        when(revocations.isRevoked(eq(7L), any(Instant.class))).thenReturn(false);

        filter.doFilterInternal(requestWith(token), new MockHttpServletResponse(), chain);

        assertEquals("pilot", SecurityContextHolder.getContext().getAuthentication().getName());
        verify(revocations).isRevoked(eq(7L), argThat(iat -> iat != null && iat.isAfter(before)));
    }

    @Test
    void failedPasswordLockDoesNotEndAnExistingSession() throws Exception {
        AppUser user = users.findByUsername("pilot").orElseThrow();
        for (int i = 0; i < 5; i++)
            com.uav.platform.service.impl.user.UserAccountServiceImpl.incrementFailedAttempts(user);
        assertNotNull(user.getLockTime());
        String token = provider.generateToken(7L, "pilot", "p@x.vn", "ROLE_PILOT");

        filter.doFilterInternal(requestWith(token), new MockHttpServletResponse(), chain);

        assertEquals("pilot", SecurityContextHolder.getContext().getAuthentication().getName());
    }

    @Test
    void manualLockSuspensionAndDeactivationEndTheSession() throws Exception {
        AppUser user = users.findByUsername("pilot").orElseThrow();
        String token = provider.generateToken(7L, "pilot", "p@x.vn", "ROLE_PILOT");

        user.setManualLocked(true);
        filter.doFilterInternal(requestWith(token), new MockHttpServletResponse(), chain);
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        user.setManualLocked(false);
        for (UserStatus status : new UserStatus[] {UserStatus.SUSPENDED, UserStatus.INACTIVE}) {
            user.setStatus(status);
            filter.doFilterInternal(requestWith(token), new MockHttpServletResponse(), chain);
            assertNull(SecurityContextHolder.getContext().getAuthentication(), status.name());
        }
    }

    @Test
    void filterWithoutRevocationServiceKeepsWorking() throws Exception {
        var plain = new JwtAuthenticationFilter(provider, null, users, null);
        String token = provider.generateToken(7L, "pilot", "p@x.vn", "ROLE_PILOT");

        plain.doFilterInternal(requestWith(token), new MockHttpServletResponse(), chain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
