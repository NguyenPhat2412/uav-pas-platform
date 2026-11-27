package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.record.MailConnectionCheck;
import com.uav.platform.dto.response.EmailStatusResponse;
import com.uav.platform.dto.response.EmailTestResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.AuthMailService;
import com.uav.platform.service.MailOtpSettingsService;

import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

class MailDiagnosticsServiceImplCoverageTest {

    private AuthMailService authMail;
    private ObjectProvider<JavaMailSender> senderProvider;
    private IUserDao users;
    private AtomicReference<Instant> nowRef;
    private Clock mutableClock;
    private MailDiagnosticsServiceImpl service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        authMail = mock(AuthMailService.class);
        senderProvider = mock(ObjectProvider.class);
        users = mock(IUserDao.class);
        nowRef = new AtomicReference<>(Instant.parse("2026-10-25T10:00:00Z"));
        mutableClock =
                new Clock() {
                    @Override
                    public ZoneId getZone() {
                        return ZoneOffset.UTC;
                    }

                    @Override
                    public Clock withZone(ZoneId zone) {
                        return this;
                    }

                    @Override
                    public Instant instant() {
                        return nowRef.get();
                    }
                };
        service =
                new MailDiagnosticsServiceImpl(
                        authMail,
                        senderProvider,
                        users,
                        "no-reply@uav.vn",
                        "smtp.uav.vn",
                        "smtp-user",
                        587,
                        mutableClock);
    }

    @AfterEach
    void tearDown() {
        service.shutdown();
    }

    private static Authentication auth(String name) {
        return UsernamePasswordAuthenticationToken.authenticated(name, null, List.of());
    }

    private static AppUser admin(String username, String email) {
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setEmail(email);
        return u;
    }

    @Test
    @SuppressWarnings("unchecked")
    void statusCoversStaticSettingsDynamicSettingsAndLocalhostDetection() {
        // Spring constructor smoke check
        MailDiagnosticsServiceImpl springSvc =
                new MailDiagnosticsServiceImpl(
                        authMail, senderProvider, users, "a@uav.vn", "localhost", "", 25);
        try {
            when(authMail.isMailEnabled()).thenReturn(false);
            EmailStatusResponse local = springSvc.status(null);
            assertFalse(local.enabled());
            assertFalse(local.hostConfigured());
            assertFalse(local.usernameConfigured());
            assertNull(local.testRecipient());
            assertEquals("DISABLED", local.connection().status());
        } finally {
            springSvc.shutdown();
        }

        // Dynamic MailOtpSettingsService active + email lookup fallback
        MailOtpSettingsService dyn = mock(MailOtpSettingsService.class);
        ObjectProvider<MailOtpSettingsService> dynProvider = mock(ObjectProvider.class);
        when(dynProvider.getIfAvailable()).thenReturn(dyn);
        service.setMailOtpSettingsProvider(dynProvider);

        JavaMailSender plainSender = mock(JavaMailSender.class);
        when(dyn.isMailEnabled()).thenReturn(true);
        when(dyn.currentMailSender()).thenReturn(plainSender);
        when(dyn.effectiveSmtpHost()).thenReturn("smtp.gmail.com");
        when(dyn.effectiveSmtpUsername()).thenReturn("ops@uav.vn");
        when(dyn.effectiveSmtpPort()).thenReturn(465);
        when(dyn.effectiveFromAddress()).thenReturn("noreply@uav.vn");
        when(dyn.effectiveSenderDisplayName()).thenReturn("UAV PAS");

        when(users.findByUsername("admin@uav.vn")).thenReturn(Optional.empty());
        when(users.findByEmail("admin@uav.vn"))
                .thenReturn(Optional.of(admin("admin", "admin@uav.vn")));

        EmailStatusResponse st = service.status(auth("admin@uav.vn"));
        assertTrue(st.enabled());
        assertTrue(st.senderAvailable());
        assertTrue(st.hostConfigured());
        assertTrue(st.usernameConfigured());
        assertEquals(465, st.port());
        assertEquals("noreply@uav.vn", st.fromAddress());
        assertNotNull(st.testRecipient());
        assertEquals("UNKNOWN", st.connection().status());
    }

    @Test
    @SuppressWarnings("unchecked")
    void sendTestCoversGuardsDisplayNameFallbackMimeCooldownAndFailure() {
        // 1. Disabled -> conflict
        when(authMail.isMailEnabled()).thenReturn(false);
        assertThrows(SystemException.class, () -> service.sendTest(auth("admin")));

        // 2. Missing admin email -> badRequest
        when(authMail.isMailEnabled()).thenReturn(true);
        when(users.findByUsername("noemail")).thenReturn(Optional.of(admin("noemail", "  ")));
        assertThrows(SystemException.class, () -> service.sendTest(auth("noemail")));

        // 3. Sender null even after senderProvider.getObject() -> conflict
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin("admin", "admin@uav.vn")));
        when(senderProvider.getIfAvailable()).thenReturn(null);
        when(senderProvider.getObject()).thenReturn(null);
        assertThrows(SystemException.class, () -> service.sendTest(auth("admin")));

        // Advance past cooldown
        nowRef.set(nowRef.get().plus(Duration.ofMinutes(2)));

        // 4. Success with displayName and createMimeMessage returning null -> fallback MimeMessage
        MailOtpSettingsService dyn = mock(MailOtpSettingsService.class);
        ObjectProvider<MailOtpSettingsService> dynProvider = mock(ObjectProvider.class);
        when(dynProvider.getIfAvailable()).thenReturn(dyn);
        service.setMailOtpSettingsProvider(dynProvider);

        JavaMailSender sender = mock(JavaMailSender.class);
        when(dyn.isMailEnabled()).thenReturn(true);
        when(dyn.currentMailSender()).thenReturn(sender);
        when(dyn.effectiveFromAddress()).thenReturn("no-reply@uav.vn");
        when(dyn.effectiveSenderDisplayName()).thenReturn("UAV PAS Ops");
        when(sender.createMimeMessage()).thenReturn(null);

        EmailTestResponse ok = service.sendTest(auth("admin"));
        assertTrue(ok.success());
        assertNull(ok.errorClass());
        verify(sender).send(any(MimeMessage.class));

        // 5. Immediate retry within cooldown -> rate limited
        assertThrows(SystemException.class, () -> service.sendTest(auth("admin")));

        // 6. After cooldown, without display name, sender.send throws -> EmailTestResponse(false)
        nowRef.set(nowRef.get().plus(Duration.ofMinutes(2)));
        when(dyn.effectiveSenderDisplayName()).thenReturn("");
        when(sender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new RuntimeException("smtp fail")).when(sender).send(any(MimeMessage.class));

        EmailTestResponse failed = service.sendTest(auth("admin"));
        assertFalse(failed.success());
        assertEquals("RuntimeException", failed.errorClass());
    }

    @Test
    void connectionProbeCoversUpCacheInvalidationDownAndInterrupted() throws Exception {
        JavaMailSenderImpl impl = mock(JavaMailSenderImpl.class);
        when(authMail.isMailEnabled()).thenReturn(true);
        when(senderProvider.getIfAvailable()).thenReturn(impl);

        // 1. UP + cached
        doNothing().when(impl).testConnection();
        MailConnectionCheck first = service.connection();
        assertEquals("UP", first.status());
        nowRef.set(nowRef.get().plus(Duration.ofMinutes(2)));
        assertSame(first, service.connection());
        verify(impl, times(1)).testConnection();

        // 2. Invalidate cache + ExecutionException -> DOWN
        service.invalidateConnectionCache();
        doThrow(new MessagingException("refused")).when(impl).testConnection();
        MailConnectionCheck down = service.connection();
        assertEquals("DOWN", down.status());
        assertEquals("MessagingException", down.errorClass());

        // 3. Cache expired + InterruptedException -> UNKNOWN
        nowRef.set(nowRef.get().plus(Duration.ofMinutes(6)));
        CountDownLatch started = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(
                        inv -> {
                            started.countDown();
                            release.await();
                            return null;
                        })
                .when(impl)
                .testConnection();

        Thread caller =
                new Thread(
                        () -> {
                            MailConnectionCheck interrupted = service.connection();
                            assertEquals("UNKNOWN", interrupted.status());
                            assertEquals("InterruptedException", interrupted.errorClass());
                            assertTrue(Thread.interrupted());
                        });
        caller.start();
        started.await();
        caller.interrupt();
        caller.join(2000);
        release.countDown();
    }
}
