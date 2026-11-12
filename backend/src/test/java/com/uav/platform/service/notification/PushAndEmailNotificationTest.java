package com.uav.platform.service.notification;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.uav.platform.controller.notification.NotificationController;
import com.uav.platform.dto.request.mission.MissionResourceRedispatchRequest;
import com.uav.platform.dto.request.mission.ResourceAssignmentRequest;
import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.dto.request.notification.RegisterPushTokenRequest;
import com.uav.platform.dto.response.notification.PushTokenResponse;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.notification.Notification;
import com.uav.platform.entity.notification.PushDeviceToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.enums.notification.PushPlatform;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.mapper.billing.BillingMapper;
import com.uav.platform.mapper.mission.MissionMapper;
import com.uav.platform.mapper.notification.NotificationMapper;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.PaymentTransactionRepository;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.mission.MissionEquipmentReservationRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.notification.NotificationRepository;
import com.uav.platform.repository.notification.PushDeviceTokenRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.AuthMailService;
import com.uav.platform.service.auth.EmailDomainPolicyService;
import com.uav.platform.service.impl.auth.EmailDomainPolicyServiceImpl;
import com.uav.platform.service.impl.billing.BillingServiceImpl;
import com.uav.platform.service.impl.mission.MissionDispatchServiceImpl;
import com.uav.platform.service.impl.notification.NotificationDeliveryOperations;
import com.uav.platform.service.impl.notification.NotificationServiceImpl;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.mission.MissionEventService;
import com.uav.platform.service.mission.MissionResourceService;
import com.uav.platform.service.permission.PermissionService;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.concurrent.atomic.AtomicReference;

class PushAndEmailNotificationTest {

    private final ObjectMapper json = new ObjectMapper();
    private HttpServer expoServer;
    private NotificationRepository notificationRepository;
    private PushDeviceTokenRepository pushTokenRepository;
    private UserRepository userRepository;
    private JavaMailSender mailSender;
    private AuthMailService authMailService;
    private NotificationDeliveryOperations deliveryOperations;
    private NotificationServiceImpl notificationService;

    private AppUser userA;
    private AppUser userB;
    private final Map<String, PushDeviceToken> tokenStore = new LinkedHashMap<>();
    private long nextTokenId = 1L;
    private long nextNotificationId = 500L;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        pushTokenRepository = mock(PushDeviceTokenRepository.class);
        userRepository = mock(UserRepository.class);
        mailSender = mock(JavaMailSender.class);

        when(mailSender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));
        authMailService = new AuthMailService(mailSender, true, "no-reply@uav.all1.vn", false);

        userA = new AppUser();
        userA.setId(11L);
        userA.setUsername("pilot_alpha");
        userA.setFullName("Nguyễn Phi Công");
        userA.setEmail("pilot.alpha@uav.all1.vn");

        userB = new AppUser();
        userB.setId(22L);
        userB.setUsername("customer_beta");
        userB.setFullName("Trần Khách Hàng");
        userB.setEmail("customer.beta@gmail.com");

        when(userRepository.findByUsername("pilot_alpha")).thenReturn(Optional.of(userA));
        when(userRepository.findByUsername("customer_beta")).thenReturn(Optional.of(userB));
        when(userRepository.findById(11L)).thenReturn(Optional.of(userA));
        when(userRepository.findById(22L)).thenReturn(Optional.of(userB));

        when(pushTokenRepository.findByToken(anyString()))
                .thenAnswer(inv -> Optional.ofNullable(tokenStore.get(inv.getArgument(0))));
        when(pushTokenRepository.findByUserIdAndActiveTrue(anyLong()))
                .thenAnswer(
                        inv -> {
                            Long uid = inv.getArgument(0);
                            return tokenStore.values().stream()
                                    .filter(
                                            t ->
                                                    t.isActive()
                                                            && t.getUser() != null
                                                            && uid.equals(t.getUser().getId()))
                                    .toList();
                        });
        when(pushTokenRepository.save(any(PushDeviceToken.class)))
                .thenAnswer(
                        inv -> {
                            PushDeviceToken t = inv.getArgument(0);
                            if (t.getId() == null) {
                                t.setId(nextTokenId++);
                            }
                            tokenStore.put(t.getToken(), t);
                            return t;
                        });

        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(
                        inv -> {
                            Notification n = inv.getArgument(0);
                            if (n.getId() == null) {
                                n.setId(nextNotificationId++);
                            }
                            return n;
                        });

        ObjectProvider<AuthMailService> authMailProvider = mock(ObjectProvider.class);
        when(authMailProvider.getIfAvailable()).thenReturn(authMailService);
        ObjectProvider<JavaMailSender> mailSenderProvider = mock(ObjectProvider.class);
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);

        deliveryOperations =
                new NotificationDeliveryOperations(
                        pushTokenRepository,
                        authMailProvider,
                        mailSenderProvider,
                        true,
                        "http://127.0.0.1:9/push",
                        "test-expo-token",
                        "no-reply@uav.all1.vn");
        deliveryOperations.useSynchronousExecutor();

        notificationService =
                new NotificationServiceImpl(
                        notificationRepository,
                        userRepository,
                        Mappers.getMapper(NotificationMapper.class));
        notificationService.setPushTokenRepository(pushTokenRepository);
        notificationService.setDeliveryOperations(deliveryOperations);
    }

    @AfterEach
    void tearDown() {
        if (expoServer != null) {
            expoServer.stop(0);
        }
        if (deliveryOperations != null) {
            deliveryOperations.shutdown();
        }
    }

    @Test
    void registerReassignAndUnregisterPushTokenLifecycleAndControllerWireShape() throws Exception {
        Authentication authA =
                new UsernamePasswordAuthenticationToken("pilot_alpha", "n/a", List.of());
        Authentication authB =
                new UsernamePasswordAuthenticationToken("customer_beta", "n/a", List.of());

        MockMvc mvc =
                MockMvcBuilders.standaloneSetup(new NotificationController(notificationService))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();

        // 1. User A registers token via HTTP POST /api/v1/notifications/push-tokens
        mvc.perform(
                        post("/api/v1/notifications/push-tokens")
                                .principal(authA)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"token":"ExponentPushToken[shared-device-01]","platform":"IOS","deviceName":"iPhone 15 Pro"}
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(11))
                .andExpect(jsonPath("$.platform").value("IOS"))
                .andExpect(jsonPath("$.active").value(true));

        // 2. User B logs in on the same physical device -> token is reassigned to User B
        PushTokenResponse reassigned =
                notificationService.registerPushToken(
                        new RegisterPushTokenRequest(
                                "ExponentPushToken[shared-device-01]",
                                PushPlatform.IOS,
                                "iPhone 15 Pro"),
                        authB);
        assertEquals(22L, reassigned.userId());
        assertTrue(reassigned.active());
        assertEquals(0, pushTokenRepository.findByUserIdAndActiveTrue(11L).size());
        assertEquals(1, pushTokenRepository.findByUserIdAndActiveTrue(22L).size());

        // 3. User A attempting to unregister User B's token does NOT deactivate User B's token
        notificationService.unregisterPushToken("ExponentPushToken[shared-device-01]", authA);
        assertTrue(tokenStore.get("ExponentPushToken[shared-device-01]").isActive());

        // 4. User B unregisters via HTTP DELETE /api/v1/notifications/push-tokens -> active=false
        mvc.perform(
                        delete("/api/v1/notifications/push-tokens")
                                .principal(authB)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"token\":\"ExponentPushToken[shared-device-01]\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Push device token unregistered"));

        assertFalse(tokenStore.get("ExponentPushToken[shared-device-01]").isActive());
    }

    @Test
    void expoPushHttpDispatcherDeactivatesStaleTokensAndSendsOperationalEmail() throws Exception {
        AtomicReference<String> receivedAuthHeader = new AtomicReference<>();
        AtomicReference<String> receivedRequestBody = new AtomicReference<>();

        expoServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        expoServer.createContext(
                "/--/api/v2/push/send",
                exchange -> {
                    receivedAuthHeader.set(exchange.getRequestHeaders().getFirst("Authorization"));
                    String body =
                            new String(
                                    exchange.getRequestBody().readAllBytes(),
                                    StandardCharsets.UTF_8);
                    receivedRequestBody.set(body);

                    String responseJson =
                            """
                            {
                              "data": [
                                { "status": "ok", "id": "ticket-valid-1" },
                                {
                                  "status": "error",
                                  "message": "The recipient device is not registered with FCM.",
                                  "details": {
                                    "error": "DeviceNotRegistered",
                                    "expoPushToken": "ExponentPushToken[stale-android-2]"
                                  }
                                }
                              ]
                            }
                            """;
                    byte[] respBytes = responseJson.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().add("Content-Type", "application/json");
                    exchange.sendResponseHeaders(200, respBytes.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(respBytes);
                    }
                });
        expoServer.start();

        int port = expoServer.getAddress().getPort();
        deliveryOperations.setExpoPushUrl("http://127.0.0.1:" + port + "/--/api/v2/push/send");

        Authentication authA =
                new UsernamePasswordAuthenticationToken("pilot_alpha", "n/a", List.of());
        notificationService.registerPushToken(
                new RegisterPushTokenRequest(
                        "ExponentPushToken[valid-ios-1]", PushPlatform.IOS, "iPad Mini"),
                authA);
        notificationService.registerPushToken(
                new RegisterPushTokenRequest(
                        "ExponentPushToken[stale-android-2]",
                        PushPlatform.ANDROID,
                        "Galaxy Tab Active"),
                authA);

        var response =
                notificationService.sendNotification(
                        new CreateNotificationRequest(
                                11L,
                                "Bạn được phân công nhiệm vụ MSN-2026-000120",
                                "Kiểm tra hành lang lưới điện Hòa Lạc",
                                NotificationType.MISSION_ASSIGNED,
                                "MISSION",
                                120L));

        assertNotNull(response);
        assertEquals("Bearer test-expo-token", receivedAuthHeader.get());
        assertNotNull(receivedRequestBody.get());

        JsonNode sentArray = json.readTree(receivedRequestBody.get());
        assertTrue(sentArray.isArray());
        assertEquals(2, sentArray.size());
        assertEquals("ExponentPushToken[valid-ios-1]", sentArray.get(0).get("to").asText());
        assertEquals("default", sentArray.get(0).get("sound").asText());
        assertEquals("MISSION", sentArray.get(0).get("data").get("referenceType").asText());
        assertEquals(120L, sentArray.get(0).get("data").get("referenceId").asLong());

        // Stale DeviceNotRegistered token is automatically deactivated while valid token stays
        // active!
        assertTrue(tokenStore.get("ExponentPushToken[valid-ios-1]").isActive());
        assertFalse(tokenStore.get("ExponentPushToken[stale-android-2]").isActive());

        // Operational email sent with [UAV PAS] prefix
        ArgumentCaptor<MimeMessage> mailCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(1)).send(mailCaptor.capture());
        MimeMessage sentMail = mailCaptor.getValue();
        assertEquals(
                "[UAV PAS] Bạn được phân công nhiệm vụ MSN-2026-000120", sentMail.getSubject());
        assertEquals("pilot.alpha@uav.all1.vn", sentMail.getAllRecipients()[0].toString());
    }

    @Test
    @SuppressWarnings("unchecked")
    void businessEventsTriggerOperatorAndInvoiceSettlementNotifications() {
        NotificationService mockNotifications = mock(NotificationService.class);
        ObjectProvider<NotificationService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mockNotifications);

        // 1. MissionDispatchServiceImpl: assignOperator & redispatchOperator notify operator
        MissionAccessService access = mock(MissionAccessService.class);
        MissionEventService missionEvents = mock(MissionEventService.class);
        when(missionEvents.deliversNotifications()).thenReturn(false);
        MissionResourceService resources = mock(MissionResourceService.class);
        MissionEquipmentReservationRepository reservations =
                mock(MissionEquipmentReservationRepository.class);

        MissionDispatchServiceImpl dispatch =
                new MissionDispatchServiceImpl(
                        null,
                        mock(MissionRepository.class),
                        mock(PermissionService.class),
                        mock(AuditLogService.class),
                        mock(MissionEventRepository.class),
                        mock(StationRepository.class),
                        mock(InventoryService.class),
                        reservations,
                        access,
                        missionEvents,
                        resources,
                        Mappers.getMapper(MissionMapper.class));
        dispatch.setNotifications(provider);

        Mission mission = new Mission();
        mission.setId(77L);
        mission.setCode("MSN-2026-000077");
        mission.setTitle("Khảo sát địa hình");
        mission.setStatus(MissionStatus.CONFIRMED);
        mission.setVersion(1L);

        Authentication commander =
                new UsernamePasswordAuthenticationToken("commander1", "n/a", List.of());
        when(access.accessibleForUpdate(77L, commander)).thenReturn(mission);
        when(resources.lockOperator(11L)).thenReturn(userA);
        when(resources.lockOperator(22L)).thenReturn(userB);

        dispatch.assignOperator(77L, new ResourceAssignmentRequest(11L, null, null), commander);

        PermissionService dispatchPerms =
                (PermissionService) ReflectionTestUtils.getField(dispatch, "permissions");
        when(dispatchPerms.has(commander, "MISSION_ASSIGN_OPERATOR")).thenReturn(true);

        dispatch.redispatchOperator(
                77L,
                new MissionResourceRedispatchRequest(1L, 22L, "Điều phối phi công dự phòng"),
                commander);

        // 2. BillingServiceImpl: completePayment (via confirmBankTransfer) notifies customer
        InvoiceRepository invoiceRepo = mock(InvoiceRepository.class);
        PaymentTransactionRepository paymentRepo = mock(PaymentTransactionRepository.class);
        PermissionService billingPerms = mock(PermissionService.class);
        org.springframework.jdbc.core.JdbcTemplate jdbc =
                mock(org.springframework.jdbc.core.JdbcTemplate.class);

        BillingServiceImpl billing =
                new BillingServiceImpl(
                        mock(ServicePlanRepository.class),
                        invoiceRepo,
                        paymentRepo,
                        userRepository,
                        mock(MissionRepository.class),
                        billingPerms,
                        null,
                        null,
                        "",
                        Mappers.getMapper(BillingMapper.class));
        ReflectionTestUtils.setField(billing, "billingJdbc", jdbc);
        billing.setNotifications(provider);

        AppUser admin = new AppUser();
        admin.setId(1L);
        admin.setUsername("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        Authentication adminAuth =
                new UsernamePasswordAuthenticationToken("admin", "n/a", List.of());
        when(billingPerms.has(adminAuth, "USER_MANAGE")).thenReturn(true);

        Invoice invoice =
                new Invoice(
                        "INV-20261105-ABC123",
                        userB,
                        null,
                        null,
                        new BigDecimal("1500000"),
                        LocalDateTime.now().plusDays(3),
                        null);
        invoice.setId(303L);
        when(invoiceRepo.findById(303L)).thenReturn(Optional.of(invoice));
        when(invoiceRepo.save(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));
        when(paymentRepo.findByTransactionCode("FT263109988")).thenReturn(Optional.empty());
        when(paymentRepo.save(any(PaymentTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        billing.confirmBankTransfer(303L, "FT263109988", adminAuth);

        ArgumentCaptor<CreateNotificationRequest> notifCaptor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(mockNotifications, times(3)).sendNotification(notifCaptor.capture());

        List<CreateNotificationRequest> sent = new ArrayList<>(notifCaptor.getAllValues());
        assertEquals(11L, sent.get(0).userId());
        assertEquals(NotificationType.MISSION_ASSIGNED, sent.get(0).type());
        assertEquals("MISSION", sent.get(0).referenceType());

        assertEquals(22L, sent.get(1).userId());
        assertEquals(NotificationType.MISSION_ASSIGNED, sent.get(1).type());

        assertEquals(22L, sent.get(2).userId());
        assertEquals(NotificationType.PAYMENT, sent.get(2).type());
        assertEquals("INVOICE", sent.get(2).referenceType());
        assertEquals(303L, sent.get(2).referenceId());
    }

    @Test
    @SuppressWarnings("unchecked")
    void emailDispatcherHonorsDomainBlocklistAndSanitizesSubjectNewlines() throws Exception {
        EmailDomainPolicyService policy =
                new EmailDomainPolicyServiceImpl(
                        EmailDomainPolicyServiceImpl.DEFAULT_ALLOWED_DOMAINS, "blocked-corp.vn");
        ObjectProvider<EmailDomainPolicyService> policyProvider = mock(ObjectProvider.class);
        when(policyProvider.getIfAvailable()).thenReturn(policy);
        deliveryOperations.setEmailDomainPolicyProvider(policyProvider);
        deliveryOperations.setPushEnabled(false);

        AppUser blockedUser = new AppUser();
        blockedUser.setId(91L);
        blockedUser.setUsername("blocked_user");
        blockedUser.setEmail("ops@blocked-corp.vn");
        when(userRepository.findById(91L)).thenReturn(Optional.of(blockedUser));

        notificationService.sendNotification(
                new CreateNotificationRequest(
                        91L,
                        "Thông báo chặn",
                        "Không gửi SMTP tới tên miền trong blocklist",
                        NotificationType.PAYMENT,
                        "INVOICE",
                        91L));
        verify(mailSender, never()).send(any(MimeMessage.class));

        notificationService.sendNotification(
                new CreateNotificationRequest(
                        11L,
                        "Duyệt phép bay\r\nBcc: attacker@evil.org",
                        "Nội dung hợp lệ",
                        NotificationType.MISSION_STATUS_CHANGED,
                        "PERMIT",
                        11L));
        ArgumentCaptor<MimeMessage> mailCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, times(1)).send(mailCaptor.capture());
        String subject = mailCaptor.getValue().getSubject();
        assertFalse(subject.contains("\r") || subject.contains("\n"));
        assertEquals("[UAV PAS] Duyệt phép bay Bcc: attacker@evil.org", subject);
    }
}
