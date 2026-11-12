package com.uav.platform.service.impl.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.infrastructure.TlsCertificateInfo;
import com.uav.platform.dto.response.infrastructure.BackupStatusResponse;
import com.uav.platform.dto.response.infrastructure.DatabaseStatusResponse;
import com.uav.platform.dto.response.infrastructure.DeploymentInfoResponse;
import com.uav.platform.dto.response.infrastructure.EmailStatusResponse;
import com.uav.platform.dto.response.infrastructure.EmailTestResponse;
import com.uav.platform.dto.response.infrastructure.StorageStatusResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.auth.AuthMailService;
import com.uav.platform.service.infrastructure.TlsCertificateService;
import com.uav.platform.service.media.ObjectStorageService;

import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.lang.reflect.RecordComponent;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.regex.Pattern;

import javax.sql.DataSource;

/** Infrastructure responses must never carry hosts, bucket names, keys or exception messages. */
class InfrastructureNoSecretsTest {
    private static final String SECRET_HOST = "smtp.secret-host.example";
    private static final String SECRET_USER = "mailer-account";
    private static final String SECRET_ENDPOINT = "https://acct123.r2.cloudflarestorage.com/uavpas";
    private static final Pattern SENSITIVE_NAME =
            Pattern.compile(
                    "(?i).*(host|password|secret|endpoint|bucket|accesskey|username|credential|url|token).*");

    /** Any field whose name suggests a secret may only be a flag; publicUrl is the one deliberate exception. */
    @Test
    void sensitiveLookingFieldsAreBooleansOnly() {
        for (Class<?> type :
                List.of(
                        DeploymentInfoResponse.class,
                        DeploymentInfoResponse.Migration.class,
                        BackupStatusResponse.class,
                        BackupStatusResponse.BackupFile.class,
                        StorageStatusResponse.class,
                        StorageStatusResponse.MediaStats.class,
                        DatabaseStatusResponse.class,
                        DatabaseStatusResponse.Connections.class,
                        DatabaseStatusResponse.TableSize.class,
                        DatabaseStatusResponse.Pool.class,
                        EmailStatusResponse.class,
                        EmailTestResponse.class,
                        TlsCertificateInfo.class)) {
            for (RecordComponent component : type.getRecordComponents()) {
                if (component.getName().equals("publicUrl")) continue;
                if (SENSITIVE_NAME.matcher(component.getName()).matches()) {
                    assertEquals(
                            boolean.class,
                            component.getType(),
                            type.getSimpleName() + "." + component.getName());
                }
            }
        }
    }

    private static Authentication admin() {
        return new UsernamePasswordAuthenticationToken("admin", "n/a", List.of());
    }

    @SuppressWarnings("unchecked")
    private MailDiagnosticsServiceImpl mailService(JavaMailSender sender, Clock clock) {
        AuthMailService authMail = mock(AuthMailService.class);
        when(authMail.isMailEnabled()).thenReturn(true);
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        when(provider.getObject()).thenReturn(sender);
        UserRepository users = mock(UserRepository.class);
        AppUser user = mock(AppUser.class);
        when(user.getEmail()).thenReturn("operator.admin@example.org");
        when(users.findByUsername("admin")).thenReturn(Optional.of(user));
        return new MailDiagnosticsServiceImpl(
                authMail,
                provider,
                users,
                "no-reply@uav.example",
                SECRET_HOST,
                SECRET_USER,
                587,
                clock);
    }

    @Test
    void emailStatusReportsFlagsNotHostOrUser() {
        JavaMailSender sender =
                mock(JavaMailSender.class); // not JavaMailSenderImpl: probe is UNKNOWN
        EmailStatusResponse status = mailService(sender, Clock.systemUTC()).status(admin());
        assertTrue(status.hostConfigured());
        assertTrue(status.usernameConfigured());
        assertEquals("op***n@example.org", status.testRecipient());
        String text = status.toString();
        assertFalse(text.contains(SECRET_HOST));
        assertFalse(text.contains(SECRET_USER));
        assertFalse(text.contains("operator.admin"));
    }

    @Test
    void failedTestEmailReturnsExceptionTypeOnlyAndIsRateLimited() {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage())
                .thenReturn(new MimeMessage(jakarta.mail.Session.getInstance(new Properties())));
        doThrow(new MailSendException("535 auth failed for " + SECRET_USER + "@" + SECRET_HOST))
                .when(sender)
                .send(any(MimeMessage.class));
        Clock clock = Clock.fixed(Instant.parse("2026-10-25T00:00:00Z"), ZoneOffset.UTC);
        MailDiagnosticsServiceImpl service = mailService(sender, clock);

        EmailTestResponse result = service.sendTest(admin());
        assertFalse(result.success());
        assertEquals("MailSendException", result.errorClass());
        assertFalse(result.toString().contains(SECRET_HOST));

        var limited =
                assertThrows(
                        com.uav.platform.error.SystemException.class,
                        () -> service.sendTest(admin()));
        assertEquals("INFRA_MAIL_TEST_RATE_LIMITED", limited.getCode());
    }

    @Test
    void cooldownIsPerAdminAndExpires() {
        MailDiagnosticsServiceImpl service =
                mailService(mock(JavaMailSender.class), Clock.systemUTC());
        Instant t0 = Instant.parse("2026-10-25T00:00:00Z");
        assertTrue(service.tryAcquire("a", t0));
        assertFalse(service.tryAcquire("a", t0.plusSeconds(59)));
        assertTrue(service.tryAcquire("b", t0.plusSeconds(1)));
        assertTrue(service.tryAcquire("a", t0.plusSeconds(60)));
    }

    @Test
    void storageFailureIsReducedToExceptionType() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        when(storage.provider()).thenReturn("r2");
        when(storage.bucketReachable()).thenReturn(true);
        when(storage.usage(anyLong()))
                .thenThrow(new IllegalStateException("Access denied " + SECRET_ENDPOINT));
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("confirmed", 4L, "purged", 1L));
        InfrastructureServiceImpl service =
                new InfrastructureServiceImpl(
                        jdbc,
                        mock(DataSource.class),
                        storage,
                        mock(TlsCertificateService.class),
                        mock(Environment.class),
                        "1.2.3",
                        "abc123",
                        "",
                        "https://uav.example");

        StorageStatusResponse response = service.storage();
        assertEquals("UP", response.reachable());
        assertEquals("IllegalStateException", response.usageError());
        assertNull(response.objectCount());
        assertEquals(4, response.media().confirmed());
        assertFalse(response.toString().contains("r2.cloudflarestorage"));
        assertFalse(response.toString().contains("uavpas"));
    }

    @Test
    void blankBuildValuesFallBackToUnknown() {
        assertEquals("unknown", InfrastructureServiceImpl.orUnknown(""));
        assertEquals("unknown", InfrastructureServiceImpl.orUnknown(null));
        assertEquals("abc", InfrastructureServiceImpl.orUnknown(" abc "));
    }
}
