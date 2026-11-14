package com.uav.platform.service.impl.notification;

import static com.uav.platform.common.constant.SecurityConstants.AUTHORIZATION_HEADER;
import static com.uav.platform.common.constant.SecurityConstants.BEARER_PREFIX;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.notification.NotificationDeliveryPayload;
import com.uav.platform.dto.request.notification.RegisterPushTokenRequest;
import com.uav.platform.dto.response.notification.PushTokenResponse;
import com.uav.platform.entity.notification.PushDeviceToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.notification.NotificationType;
import com.uav.platform.repository.notification.PushDeviceTokenRepository;
import com.uav.platform.service.auth.AuthMailService;
import com.uav.platform.service.auth.EmailDomainPolicyService;

import jakarta.annotation.PreDestroy;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.util.HtmlUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Multi-channel notification dispatcher (Expo Push HTTP API + operational SMTP email) and
 * PushDeviceToken helper operations. External network delivery runs outside DB transactions and
 * never rolls back in-app notification persistence.
 */
@Component
@Slf4j
public class NotificationDeliveryOperations {

    private static final Set<String> EMAIL_REFERENCE_TYPES =
            Set.of("MISSION", "INVOICE", "SAR", "PERMIT");

    private static final Set<NotificationType> EMAIL_NOTIFICATION_TYPES =
            Set.of(
                    NotificationType.MISSION_ASSIGNED,
                    NotificationType.MISSION_STATUS_CHANGED,
                    NotificationType.SAR_TARGET_FOUND,
                    NotificationType.PAYMENT);

    private final ObjectMapper json = new ObjectMapper();
    private final PushDeviceTokenRepository pushTokenRepository;
    private final ObjectProvider<AuthMailService> authMailProvider;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final ExecutorService defaultExecutor;

    @Autowired(required = false)
    private ObjectProvider<EmailDomainPolicyService> emailDomainPolicyProvider;

    private Executor executor;
    private HttpClient httpClient;
    private boolean pushEnabled;
    private String expoPushUrl;
    private String expoAccessToken;
    private String fromAddress;

    @Autowired
    public NotificationDeliveryOperations(
            @Autowired(required = false) PushDeviceTokenRepository pushTokenRepository,
            @Autowired(required = false) ObjectProvider<AuthMailService> authMailProvider,
            @Autowired(required = false) ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.push.enabled:false}") boolean pushEnabled,
            @Value("${app.push.expo-url:https://exp.host/--/api/v2/push/send}") String expoPushUrl,
            @Value("${app.push.access-token:}") String expoAccessToken,
            @Value("${app.mail.from:no-reply@uav.all1.vn}") String fromAddress) {
        this.pushTokenRepository = pushTokenRepository;
        this.authMailProvider = authMailProvider;
        this.mailSenderProvider = mailSenderProvider;
        this.pushEnabled = pushEnabled;
        this.expoPushUrl = expoPushUrl;
        this.expoAccessToken = expoAccessToken;
        this.fromAddress = fromAddress;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        this.defaultExecutor =
                Executors.newFixedThreadPool(
                        2,
                        runnable -> {
                            Thread thread = new Thread(runnable, "uav-notification-delivery");
                            thread.setDaemon(true);
                            return thread;
                        });
        this.executor = this.defaultExecutor;
    }

    @PreDestroy
    public void shutdown() {
        defaultExecutor.shutdownNow();
    }

    public void setExecutor(Executor executor) {
        this.executor = executor != null ? executor : this.defaultExecutor;
    }

    public void useSynchronousExecutor() {
        this.executor = Runnable::run;
    }

    public void setHttpClient(HttpClient httpClient) {
        if (httpClient != null) {
            this.httpClient = httpClient;
        }
    }

    public void setPushEnabled(boolean pushEnabled) {
        this.pushEnabled = pushEnabled;
    }

    public void setExpoPushUrl(String expoPushUrl) {
        this.expoPushUrl = expoPushUrl;
    }

    public void setExpoAccessToken(String expoAccessToken) {
        this.expoAccessToken = expoAccessToken;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public void setEmailDomainPolicyProvider(
            ObjectProvider<EmailDomainPolicyService> emailDomainPolicyProvider) {
        this.emailDomainPolicyProvider = emailDomainPolicyProvider;
    }

    public static PushDeviceToken createOrReassign(
            PushDeviceToken existing, AppUser owner, RegisterPushTokenRequest request) {
        PushDeviceToken entity = existing != null ? existing : new PushDeviceToken();
        entity.setUser(owner);
        entity.setToken(request.token().trim());
        entity.setPlatform(request.platform());
        entity.setDeviceName(
                request.deviceName() == null || request.deviceName().isBlank()
                        ? null
                        : request.deviceName().trim());
        entity.setActive(true);
        entity.setLastSeenAt(LocalDateTime.now());
        return entity;
    }

    public static PushTokenResponse toPushTokenResponse(PushDeviceToken entity) {
        return new PushTokenResponse(
                entity.getId(),
                entity.getUser() == null ? null : entity.getUser().getId(),
                entity.getToken(),
                entity.getPlatform(),
                entity.getDeviceName(),
                entity.isActive(),
                entity.getLastSeenAt());
    }

    public void dispatchAfterCommit(NotificationDeliveryPayload payload) {
        if (payload == null) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            submit(payload);
                        }
                    });
        } else {
            submit(payload);
        }
    }

    public void submit(NotificationDeliveryPayload payload) {
        try {
            executor.execute(() -> deliverNow(payload));
        } catch (RuntimeException ex) {
            log.warn(
                    "Unable to schedule external notification delivery for userId={}: {}",
                    payload.userId(),
                    ex.getMessage());
        }
    }

    public void deliverNow(NotificationDeliveryPayload payload) {
        if (payload == null) return;
        try {
            dispatchExpoPush(payload);
        } catch (Exception ex) {
            log.warn(
                    "Expo push dispatch failed for userId={}: {}",
                    payload.userId(),
                    ex.getMessage());
        }
        try {
            dispatchOperationalEmail(payload);
        } catch (Exception ex) {
            log.warn(
                    "Operational email dispatch failed for userId={}: {}",
                    payload.userId(),
                    ex.getMessage());
        }
    }

    void dispatchExpoPush(NotificationDeliveryPayload payload) throws Exception {
        if (!pushEnabled
                || pushTokenRepository == null
                || payload.userId() == null
                || expoPushUrl == null
                || expoPushUrl.isBlank()) {
            return;
        }
        List<PushDeviceToken> activeTokens =
                pushTokenRepository.findByUserIdAndActiveTrue(payload.userId());
        if (activeTokens == null || activeTokens.isEmpty()) {
            return;
        }

        List<Map<String, Object>> messages = new ArrayList<>(activeTokens.size());
        for (PushDeviceToken device : activeTokens) {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("notificationId", payload.notificationId());
            data.put("type", payload.type() != null ? payload.type().name() : null);
            data.put("referenceType", payload.referenceType());
            data.put("referenceId", payload.referenceId());

            Map<String, Object> message = new LinkedHashMap<>();
            message.put("to", device.getToken());
            message.put("title", payload.title());
            message.put("body", payload.content());
            message.put("sound", "default");
            message.put("data", data);
            messages.add(message);
        }

        String requestBody = json.writeValueAsString(messages);
        HttpRequest.Builder reqBuilder =
                HttpRequest.newBuilder(URI.create(expoPushUrl.trim()))
                        .timeout(Duration.ofSeconds(10))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .POST(
                                HttpRequest.BodyPublishers.ofString(
                                        requestBody, StandardCharsets.UTF_8));
        if (expoAccessToken != null && !expoAccessToken.isBlank()) {
            reqBuilder.header(AUTHORIZATION_HEADER, BEARER_PREFIX + expoAccessToken.trim());
        }

        HttpResponse<String> response =
                httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
        handleExpoPushResponse(activeTokens, response.body());
    }

    void handleExpoPushResponse(List<PushDeviceToken> sentTokens, String responseBody) {
        if (responseBody == null
                || responseBody.isBlank()
                || !responseBody.contains("DeviceNotRegistered")) {
            return;
        }
        try {
            JsonNode root = json.readTree(responseBody);
            JsonNode data = root.path("data");
            if (data.isArray()) {
                int count = Math.min(data.size(), sentTokens.size());
                for (int i = 0; i < count; i++) {
                    JsonNode ticket = data.get(i);
                    if (isDeviceNotRegisteredTicket(ticket)) {
                        deactivateToken(sentTokens.get(i));
                    }
                }
                return;
            }
            if (data.isObject() && isDeviceNotRegisteredTicket(data)) {
                String reportedToken = data.path("details").path("expoPushToken").asText(null);
                if (reportedToken != null && !reportedToken.isBlank()) {
                    for (PushDeviceToken token : sentTokens) {
                        if (reportedToken.equals(token.getToken())) {
                            deactivateToken(token);
                        }
                    }
                } else if (sentTokens.size() == 1) {
                    deactivateToken(sentTokens.get(0));
                }
            } else if (sentTokens.size() == 1) {
                deactivateToken(sentTokens.get(0));
            }
        } catch (Exception ex) {
            if (sentTokens.size() == 1) {
                deactivateToken(sentTokens.get(0));
            }
        }
    }

    private static boolean isDeviceNotRegisteredTicket(JsonNode ticket) {
        if (ticket == null || ticket.isMissingNode()) return false;
        String detailError = ticket.path("details").path("error").asText("");
        if ("DeviceNotRegistered".equals(detailError)) return true;
        return ticket.toString().contains("DeviceNotRegistered");
    }

    private void deactivateToken(PushDeviceToken token) {
        if (token == null || !token.isActive()) return;
        token.setActive(false);
        token.setLastSeenAt(LocalDateTime.now());
        pushTokenRepository.save(token);
    }

    void dispatchOperationalEmail(NotificationDeliveryPayload payload) throws Exception {
        if (!isOperationalEmailCandidate(payload.type(), payload.referenceType())) {
            return;
        }
        AuthMailService authMail =
                authMailProvider == null ? null : authMailProvider.getIfAvailable();
        JavaMailSender mailSender =
                mailSenderProvider == null ? null : mailSenderProvider.getIfAvailable();
        if (authMail == null || !authMail.isMailEnabled() || mailSender == null) {
            return;
        }
        String toEmail = payload.userEmail() == null ? null : payload.userEmail().trim();
        if (toEmail == null || toEmail.isBlank()) {
            return;
        }
        EmailDomainPolicyService domainPolicy =
                emailDomainPolicyProvider == null
                        ? null
                        : emailDomainPolicyProvider.getIfAvailable();
        if (domainPolicy != null) {
            if (!domainPolicy.isAllowedForOutboundSmtp(toEmail)) {
                return;
            }
        } else if (EmailDomainPolicyService.isReservedOrDisposable(toEmail)) {
            return;
        }

        MimeMessage message = mailSender.createMimeMessage();
        if (message == null) {
            message = new MimeMessage((Session) null);
        }
        MimeMessageHelper helper =
                new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
        helper.setFrom(
                fromAddress == null || fromAddress.isBlank()
                        ? "no-reply@uav.all1.vn"
                        : fromAddress.trim());
        helper.setTo(toEmail);
        String sanitizedSubject =
                payload.title() == null
                        ? "Thông báo vận hành"
                        : payload.title().replace("\r", "").replace("\n", " ").trim();
        helper.setSubject("[UAV PAS] " + sanitizedSubject);
        helper.setText(buildOperationalHtml(payload), true);
        mailSender.send(message);
    }

    static boolean isOperationalEmailCandidate(NotificationType type, String referenceType) {
        if (referenceType != null && !referenceType.isBlank()) {
            String normalized = referenceType.trim().toUpperCase(Locale.ROOT);
            if (EMAIL_REFERENCE_TYPES.contains(normalized)) {
                return true;
            }
        }
        return type != null && EMAIL_NOTIFICATION_TYPES.contains(type);
    }

    private static String buildOperationalHtml(NotificationDeliveryPayload payload) {
        String greeting =
                payload.userFullName() != null && !payload.userFullName().isBlank()
                        ? "Xin chào " + HtmlUtils.htmlEscape(payload.userFullName().trim()) + ","
                        : "Xin chào,";
        String safeTitle = HtmlUtils.htmlEscape(payload.title() == null ? "" : payload.title());
        String safeContent =
                HtmlUtils.htmlEscape(payload.content() == null ? "" : payload.content());
        String refBadge =
                payload.referenceType() != null && payload.referenceId() != null
                        ? "<p style=\"margin: 16px 0 0; font-size: 12px; color: #64748b;\">Mã tham chiếu: <strong>"
                                + HtmlUtils.htmlEscape(payload.referenceType())
                                + " #"
                                + payload.referenceId()
                                + "</strong></p>"
                        : "";
        return """
                <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; background: #ffffff;">
                  <div style="background: #ab2523; color: #ffffff; padding: 14px 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                    UAV PAS · HỆ THỐNG ĐIỀU PHỐI VẬN HÀNH BAY
                  </div>
                  <div style="padding: 24px 20px; color: #0f172a;">
                    <p style="margin: 0 0 12px; font-size: 14px; color: #334155;">%s</p>
                    <h2 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">%s</h2>
                    <div style="background: #f8fafc; border-left: 3px solid #ab2523; padding: 14px 16px; font-size: 14px; line-height: 1.6; color: #1e293b;">
                      %s
                    </div>
                    %s
                  </div>
                </div>
                """
                .formatted(greeting, safeTitle, safeContent, refBadge);
    }
}
