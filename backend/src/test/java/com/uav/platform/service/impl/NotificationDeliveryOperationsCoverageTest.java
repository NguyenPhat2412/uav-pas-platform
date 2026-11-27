package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IPushDeviceTokenDao;
import com.uav.platform.dto.record.NotificationDeliveryPayload;
import com.uav.platform.dto.request.RegisterPushTokenRequest;
import com.uav.platform.dto.response.PushTokenResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.PushDeviceToken;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.enums.PushPlatform;
import com.uav.platform.service.AuthMailService;
import com.uav.platform.service.EmailDomainPolicyService;
import com.uav.platform.service.InvoiceMailService;
import com.uav.platform.service.MailOtpSettingsService;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@ExtendWith(MockitoExtension.class)
class NotificationDeliveryOperationsCoverageTest {

    @Mock private IPushDeviceTokenDao pushTokenRepository;
    @Mock private ObjectProvider<AuthMailService> authMailProvider;
    @Mock private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock private ObjectProvider<EmailDomainPolicyService> domainPolicyProvider;
    @Mock private ObjectProvider<MailOtpSettingsService> mailOtpSettingsProvider;
    @Mock private ObjectProvider<InvoiceMailService> invoiceMailServiceProvider;
    @Mock private HttpClient httpClient;

    private NotificationDeliveryOperations ops;

    @BeforeEach
    void setUp() {
        ops =
                new NotificationDeliveryOperations(
                        pushTokenRepository,
                        authMailProvider,
                        mailSenderProvider,
                        true,
                        "https://exp.host/--/api/v2/push/send",
                        "expo-secret",
                        "no-reply@uav.all1.vn");
        ops.useSynchronousExecutor();
        ops.setHttpClient(httpClient);
        ops.setEmailDomainPolicyProvider(domainPolicyProvider);
        ops.setMailOtpSettingsProvider(mailOtpSettingsProvider);
        ops.setInvoiceMailServiceProvider(invoiceMailServiceProvider);
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        ops.shutdown();
    }

    private NotificationDeliveryPayload payload(
            NotificationType type, String refType, String email, Boolean push, Boolean emailOk) {
        return new NotificationDeliveryPayload(
                1L,
                10L,
                email,
                "Alice",
                "Alert Title",
                "Body text",
                type,
                refType,
                99L,
                push,
                emailOk);
    }

    @Test
    void settersTokenHelpersAndTransactionAfterCommitWork() {
        ops.setExecutor(null);
        ops.useSynchronousExecutor();
        ops.setHttpClient(null);
        ops.setPushEnabled(true);
        ops.setExpoPushUrl("https://exp.host/--/api/v2/push/send");
        ops.setExpoAccessToken("tok-1");
        ops.setFromAddress("ops@uav.all1.vn");

        AppUser user = new AppUser();
        user.setId(5L);
        PushDeviceToken created =
                NotificationDeliveryOperations.createOrReassign(
                        null,
                        user,
                        new RegisterPushTokenRequest(
                                "  ExponentPushToken[abc] ", PushPlatform.IOS, "  "));
        assertNull(created.getDeviceName());
        assertEquals("ExponentPushToken[abc]", created.getToken());

        PushDeviceToken reassigned =
                NotificationDeliveryOperations.createOrReassign(
                        created,
                        user,
                        new RegisterPushTokenRequest(
                                "ExponentPushToken[xyz]", PushPlatform.ANDROID, "Pixel"));
        assertSame(created, reassigned);
        assertEquals("Pixel", reassigned.getDeviceName());

        PushTokenResponse resp = NotificationDeliveryOperations.toPushTokenResponse(reassigned);
        assertEquals(5L, resp.userId());

        PushDeviceToken orphan = new PushDeviceToken();
        assertNull(NotificationDeliveryOperations.toPushTokenResponse(orphan).userId());

        // Null payload no-op
        ops.dispatchAfterCommit(null);
        ops.deliverNow(null);

        // Executor throwing RuntimeException is swallowed
        ops.setExecutor(
                r -> {
                    throw new RuntimeException("pool full");
                });
        assertDoesNotThrow(
                () -> ops.submit(payload(NotificationType.SYSTEM, null, null, false, false)));

        // Inside active transaction defers until afterCommit
        AtomicBoolean ran = new AtomicBoolean(false);
        ops.setExecutor(r -> ran.set(true));
        TransactionSynchronizationManager.initSynchronization();
        ops.dispatchAfterCommit(payload(NotificationType.SYSTEM, null, null, false, false));
        assertFalse(ran.get());
        for (TransactionSynchronization sync :
                TransactionSynchronizationManager.getSynchronizations()) {
            sync.afterCommit();
        }
        assertTrue(ran.get());
    }

    @Test
    @SuppressWarnings("unchecked")
    void deliverNowSwallowsPushAndEmailExceptionsAndHandlesAllExpoResponseShapes()
            throws Exception {
        // Push throws exception, email throws exception -> both swallowed
        PushDeviceToken t1 = new PushDeviceToken();
        t1.setToken("ExponentPushToken[1]");
        t1.setActive(true);
        when(pushTokenRepository.findByUserIdAndActiveTrue(10L)).thenReturn(List.of(t1));
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new RuntimeException("network down"));

        MailOtpSettingsService dynMail = mock(MailOtpSettingsService.class);
        when(mailOtpSettingsProvider.getIfAvailable()).thenReturn(dynMail);
        when(dynMail.isMailEnabled()).thenThrow(new RuntimeException("smtp config boom"));

        assertDoesNotThrow(
                () ->
                        ops.deliverNow(
                                payload(
                                        NotificationType.MISSION_ASSIGNED,
                                        "MISSION",
                                        "pilot@uav.vn",
                                        true,
                                        true)));

        // Empty active tokens returns early
        when(pushTokenRepository.findByUserIdAndActiveTrue(10L)).thenReturn(List.of());
        ops.dispatchExpoPush(
                payload(NotificationType.MISSION_ASSIGNED, "MISSION", null, true, false));

        // handleExpoPushResponse: blank / no DeviceNotRegistered -> no-op
        ops.handleExpoPushResponse(List.of(t1), "{\"data\":[{\"status\":\"ok\"}]}");
        assertTrue(t1.isActive());

        // Object data with matching expoPushToken
        PushDeviceToken t2 = new PushDeviceToken();
        t2.setToken("ExponentPushToken[2]");
        t2.setActive(true);
        ops.handleExpoPushResponse(
                List.of(t1, t2),
                "{\"data\":{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\",\"expoPushToken\":\"ExponentPushToken[2]\"}}}");
        assertTrue(t1.isActive());
        assertFalse(t2.isActive());

        // Object data without expoPushToken + single token -> deactivates single token
        PushDeviceToken t3 = new PushDeviceToken();
        t3.setToken("ExponentPushToken[3]");
        t3.setActive(true);
        ops.handleExpoPushResponse(
                List.of(t3),
                "{\"data\":{\"status\":\"error\",\"message\":\"DeviceNotRegistered\"}}");
        assertFalse(t3.isActive());

        // Non-object/non-array data containing DeviceNotRegistered + single token
        PushDeviceToken t4 = new PushDeviceToken();
        t4.setToken("ExponentPushToken[4]");
        t4.setActive(true);
        ops.handleExpoPushResponse(List.of(t4), "{\"error\":\"DeviceNotRegistered\"}");
        assertFalse(t4.isActive());

        // Malformed JSON containing DeviceNotRegistered + single token -> catch branch deactivates
        PushDeviceToken t5 = new PushDeviceToken();
        t5.setToken("ExponentPushToken[5]");
        t5.setActive(true);
        ops.handleExpoPushResponse(List.of(t5), "not-json DeviceNotRegistered");
        assertFalse(t5.isActive());
    }

    @Test
    void dispatchOperationalEmailCoversDynamicSettingsNullMimeMessageBlankToAndPolicies()
            throws Exception {
        // InvoiceMailService skips INVOICE emails
        when(invoiceMailServiceProvider.getIfAvailable())
                .thenReturn(mock(InvoiceMailService.class));
        ops.dispatchOperationalEmail(
                payload(NotificationType.PAYMENT, "INVOICE", "a@b.com", false, true));
        verify(mailOtpSettingsProvider, never()).getIfAvailable();

        // Dynamic MailOtpSettingsService with displayName, createMimeMessage returning null, null
        // title
        MailOtpSettingsService dyn = mock(MailOtpSettingsService.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(mailOtpSettingsProvider.getIfAvailable()).thenReturn(dyn);
        when(dyn.isMailEnabled()).thenReturn(true);
        when(dyn.currentMailSender()).thenReturn(sender);
        when(dyn.effectiveFromAddress()).thenReturn("dispatch@uav.vn");
        when(dyn.effectiveSenderDisplayName()).thenReturn("UAV Dispatch");
        when(sender.createMimeMessage()).thenReturn(null);

        EmailDomainPolicyService policy = mock(EmailDomainPolicyService.class);
        when(domainPolicyProvider.getIfAvailable()).thenReturn(policy);
        when(policy.isAllowedForOutboundSmtp("pilot@company.vn")).thenReturn(true);

        NotificationDeliveryPayload nullTitlePayload =
                new NotificationDeliveryPayload(
                        2L,
                        10L,
                        "pilot@company.vn",
                        "",
                        null,
                        null,
                        NotificationType.SAR_TARGET_FOUND,
                        "SAR",
                        null,
                        false,
                        true);
        ops.dispatchOperationalEmail(nullTitlePayload);
        verify(sender).send(any(MimeMessage.class));

        // Blank email skipped
        ops.dispatchOperationalEmail(
                payload(NotificationType.MISSION_ASSIGNED, "MISSION", "   ", false, true));

        // Fallback without domainPolicy blocks disposable/reserved email
        when(domainPolicyProvider.getIfAvailable()).thenReturn(null);
        ops.dispatchOperationalEmail(
                payload(
                        NotificationType.MISSION_ASSIGNED,
                        "MISSION",
                        "user@example.com",
                        false,
                        true));

        // Fallback without dynamic settings uses AuthMailService + blank fromAddress default
        when(mailOtpSettingsProvider.getIfAvailable()).thenReturn(null);
        AuthMailService authMail = mock(AuthMailService.class);
        when(authMailProvider.getIfAvailable()).thenReturn(authMail);
        when(authMail.isMailEnabled()).thenReturn(true);
        when(mailSenderProvider.getIfAvailable()).thenReturn(sender);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        ops.setFromAddress("  ");
        ops.dispatchOperationalEmail(
                payload(NotificationType.MISSION_ASSIGNED, "MISSION", "real@uav.vn", false, null));
        verify(sender, times(2)).send(any(MimeMessage.class));

        // isOperationalEmailCandidate checks
        assertTrue(NotificationDeliveryOperations.isOperationalEmailCandidate(null, "PERMIT"));
        assertTrue(
                NotificationDeliveryOperations.isOperationalEmailCandidate(
                        NotificationType.PAYMENT, "OTHER"));
        assertFalse(
                NotificationDeliveryOperations.isOperationalEmailCandidate(
                        NotificationType.SYSTEM, "OTHER"));
        assertFalse(NotificationDeliveryOperations.isOperationalEmailCandidate(null, null));
    }
}
