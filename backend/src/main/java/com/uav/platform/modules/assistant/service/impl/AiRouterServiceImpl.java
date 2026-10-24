package com.uav.platform.modules.assistant.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.assistant.dto.request.AiRouterSettingsRequest;
import com.uav.platform.modules.assistant.dto.request.AssistantChatRequest;
import com.uav.platform.modules.assistant.dto.record.ChatThread;
import com.uav.platform.modules.assistant.dto.request.AssistantMessageRequest;
import com.uav.platform.modules.assistant.dto.response.*;
import com.uav.platform.modules.assistant.entity.AiRouterSettings;
import com.uav.platform.modules.assistant.repository.AiRouterSettingsRepository;
import com.uav.platform.modules.assistant.service.AiRouterService;
import com.uav.platform.modules.assistant.service.AssistantConversationService;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiRouterServiceImpl implements AiRouterService {
    /** Per-user chat budget; the gateway bills by tokens, so a runaway client must not drain it. */
    static final int CHAT_LIMIT_PER_MINUTE = 20;

    private static final int MAX_REPLY_TOKENS = 1200;

    /** Built-in platform guide appended to every system prompt so answers about UAV PAS workflows are grounded. */
    static final String PLATFORM_GUIDE = loadGuide();

    private final AiRouterSettingsRepository repository;
    private final AuditLogService audit;
    private final ObjectMapper json;
    private final SecretCipherOperations cipher;
    private final HttpClient http;
    private final Map<String, Deque<Long>> recentCalls = new ConcurrentHashMap<>();
    /** Chat history store; absent in isolated unit tests, where turns are simply not recorded. */
    private AssistantConversationService conversations;

    @Autowired(required = false)
    void setConversations(AssistantConversationService conversations) {
        this.conversations = conversations;
    }

    /** Who is asking shapes what the assistant may explain. */
    static String audienceNote(String portal) {
        return switch (portal == null ? "" : portal) {
            case "CUSTOMER" -> "Người hỏi là KHÁCH HÀNG đang dùng cổng Khách hàng. Chỉ hướng dẫn các chức năng của cổng Khách hàng "
                    + "(đặt dịch vụ, theo dõi nhiệm vụ, gói cước, thanh toán, tệp kết quả, hồ sơ). Không mô tả thao tác quản trị hay "
                    + "điều phối nội bộ, không tiết lộ thông tin của khách hàng khác; nếu cần can thiệp, hướng dẫn liên hệ bộ phận điều phối.";
            case "OPERATIONS" -> "Người hỏi là NHÂN VIÊN VẬN HÀNH/ĐIỀU PHỐI đang dùng cổng Vận hành. Tập trung vào điều phối nhiệm vụ, "
                    + "đội UAV, trạm, telemetry, SAR, bảo trì và kho thiết bị; các việc cần quyền quản trị thì chỉ ra người phụ trách.";
            case "ADMIN" -> "Người hỏi là QUẢN TRỊ VIÊN đang dùng cổng Quản trị; có thể hướng dẫn cả cấu hình, phân quyền và thanh toán.";
            default -> "";
        };
    }

    @Autowired
    public AiRouterServiceImpl(
            AiRouterSettingsRepository repository,
            AuditLogService audit,
            @Value("${app.ai-router.secret:}") String secret,
            @Value("${app.jwt.secret}") String jwtSecret) {
        this(
                repository,
                audit,
                new ObjectMapper(),
                new SecretCipherOperations(secret == null || secret.isBlank() ? jwtSecret : secret),
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(5))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build());
    }

    AiRouterServiceImpl(
            AiRouterSettingsRepository repository,
            AuditLogService audit,
            ObjectMapper json,
            SecretCipherOperations cipher,
            HttpClient http) {
        this.repository = repository;
        this.audit = audit;
        this.json = json;
        this.cipher = cipher;
        this.http = http;
    }

    private static String loadGuide() {
        try (var in =
                AiRouterServiceImpl.class.getResourceAsStream("/assistant/uav-pas-guide.md")) {
            return in == null
                    ? ""
                    : new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
        } catch (IOException e) {
            return "";
        }
    }

    private AiRouterSettings row() {
        return repository
                .findById(AiRouterSettings.SINGLETON_ID)
                .orElseThrow(
                        () ->
                                SystemException.internalError(
                                        "AI router settings row is missing",
                                        "AI_ROUTER_SETTINGS_MISSING"));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String stripSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private AiRouterSettingsResponse toResponse(AiRouterSettings s) {
        return new AiRouterSettingsResponse(
                s.getBaseUrl(),
                s.getApiKeyCipher() != null,
                s.getApiKeyHint(),
                s.getMode1Label(),
                s.getMode1Model(),
                s.getMode2Label(),
                s.getMode2Model(),
                s.getSystemPrompt(),
                s.isEnabled(),
                s.getVersion(),
                s.getUpdatedAt(),
                s.getUpdatedBy());
    }

    @Override
    @Transactional(readOnly = true)
    public AiRouterSettingsResponse settings() {
        return toResponse(row());
    }

    @Override
    @Transactional
    public AiRouterSettingsResponse update(AiRouterSettingsRequest r, Authentication auth) {
        AiRouterSettings s = row();
        if (s.getVersion() != r.expectedVersion())
            throw SystemException.conflict(
                    "Settings changed meanwhile", "AI_ROUTER_SETTINGS_STALE");
        boolean keyChanged = false;
        if (r.apiKey() != null) {
            String key = r.apiKey().trim();
            keyChanged = true;
            if (key.isEmpty()) {
                s.setApiKeyCipher(null);
                s.setApiKeyHint(null);
            } else {
                s.setApiKeyCipher(cipher.encrypt(key));
                s.setApiKeyHint(key.length() > 4 ? key.substring(key.length() - 4) : null);
            }
        }
        s.setBaseUrl(stripSlash(r.baseUrl().trim()));
        s.setMode1Label(r.mode1Label().trim());
        s.setMode1Model(trimToNull(r.mode1Model()));
        s.setMode2Label(r.mode2Label().trim());
        s.setMode2Model(trimToNull(r.mode2Model()));
        s.setSystemPrompt(trimToNull(r.systemPrompt()));
        if (r.enabled()
                && (s.getApiKeyCipher() == null
                        || (s.getMode1Model() == null && s.getMode2Model() == null)))
            throw SystemException.badRequest(
                    "Connect an API key and pick at least one model before enabling",
                    "AI_ROUTER_INCOMPLETE");
        s.setEnabled(r.enabled());
        s.setUpdatedAt(LocalDateTime.now());
        s.setUpdatedBy(auth.getName());
        AiRouterSettings saved = repository.save(s);
        audit.record(
                null,
                auth.getName(),
                AuditAction.UPDATE,
                "AI_ROUTER",
                "1",
                "enabled="
                        + saved.isEnabled()
                        + (keyChanged
                                ? ", apiKey="
                                        + (saved.getApiKeyCipher() == null ? "removed" : "replaced")
                                : ""));
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AiRouterStatusResponse status() {
        AiRouterSettings s = row();
        String base = stripSlash(s.getBaseUrl());
        String origin = base.endsWith("/v1") ? base.substring(0, base.length() - 3) : base;
        long started = System.nanoTime();
        try {
            HttpResponse<String> health =
                    http.send(
                            HttpRequest.newBuilder(URI.create(origin + "/api/health"))
                                    .timeout(Duration.ofSeconds(8))
                                    .GET()
                                    .build(),
                            HttpResponse.BodyHandlers.ofString());
            long latency = (System.nanoTime() - started) / 1_000_000;
            if (health.statusCode() >= 500)
                return new AiRouterStatusResponse(
                        false, latency, false, List.of(), "HTTP_" + health.statusCode());
            if (s.getApiKeyCipher() == null)
                return new AiRouterStatusResponse(
                        true, latency, false, List.of(), "AI_ROUTER_NO_KEY");
            HttpResponse<String> models =
                    http.send(
                            HttpRequest.newBuilder(URI.create(base + "/models"))
                                    .timeout(Duration.ofSeconds(10))
                                    .header(
                                            "Authorization",
                                            "Bearer " + cipher.decrypt(s.getApiKeyCipher()))
                                    .GET()
                                    .build(),
                            HttpResponse.BodyHandlers.ofString());
            if (models.statusCode() == 401 || models.statusCode() == 403)
                return new AiRouterStatusResponse(
                        true, latency, false, List.of(), "AI_ROUTER_UNAUTHORIZED");
            if (models.statusCode() >= 400)
                return new AiRouterStatusResponse(
                        true, latency, false, List.of(), "HTTP_" + models.statusCode());
            List<String> ids = new ArrayList<>();
            for (JsonNode m : json.readTree(models.body()).path("data")) {
                String id = m.path("id").asText("");
                if (!id.isEmpty()) ids.add(id);
            }
            ids.sort(String::compareTo);
            return new AiRouterStatusResponse(true, latency, true, ids, null);
        } catch (HttpTimeoutException e) {
            return new AiRouterStatusResponse(false, null, false, List.of(), "AI_ROUTER_TIMEOUT");
        } catch (IOException | IllegalArgumentException e) {
            return new AiRouterStatusResponse(
                    false, null, false, List.of(), "AI_ROUTER_UNREACHABLE");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new AiRouterStatusResponse(
                    false, null, false, List.of(), "AI_ROUTER_UNREACHABLE");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public AssistantInfoResponse info() {
        AiRouterSettings s = row();
        List<AssistantModeResponse> modes = new ArrayList<>();
        if (s.getMode1Model() != null)
            modes.add(new AssistantModeResponse(1, s.getMode1Label(), s.getMode1Model()));
        if (s.getMode2Model() != null)
            modes.add(new AssistantModeResponse(2, s.getMode2Label(), s.getMode2Model()));
        return new AssistantInfoResponse(
                s.isEnabled() && s.getApiKeyCipher() != null && !modes.isEmpty(), modes);
    }

    @Override
    public AssistantChatResponse chat(AssistantChatRequest r, Authentication auth) {
        AiRouterSettings s = row();
        if (!s.isEnabled() || s.getApiKeyCipher() == null)
            throw SystemException.serviceUnavailable("Assistant is off", "AI_ROUTER_DISABLED");
        String model = r.mode() == 1 ? s.getMode1Model() : s.getMode2Model();
        if (model == null)
            throw SystemException.badRequest("This mode has no model", "AI_ROUTER_MODE_UNSET");
        throttle(auth.getName());
        AssistantMessageRequest last = r.messages().get(r.messages().size() - 1);
        if (!"user".equals(last.role())) throw SystemException.badRequest("The last message must be the user's", "ASSISTANT_LAST_NOT_USER");
        ChatThread thread = conversations == null ? null
                : conversations.begin(auth, r.portal(), r.conversationId(), last.content());

        ObjectNode body = json.createObjectNode();
        body.put("model", model);
        body.put("stream", false);
        body.put("max_tokens", MAX_REPLY_TOKENS);
        ArrayNode messages = body.putArray("messages");
        String system =
                String.join(
                        "\n\n",
                        java.util.stream.Stream.of(s.getSystemPrompt(), PLATFORM_GUIDE, audienceNote(thread == null ? r.portal() : thread.portal()))
                                .filter(part -> part != null && !part.isBlank())
                                .toList());
        if (!system.isEmpty()) messages.addObject().put("role", "system").put("content", system);
        for (AssistantMessageRequest m : r.messages())
            messages.addObject().put("role", m.role()).put("content", m.content());

        long started = System.nanoTime();
        try {
            HttpResponse<String> res =
                    http.send(
                            HttpRequest.newBuilder(
                                            URI.create(
                                                    stripSlash(s.getBaseUrl())
                                                            + "/chat/completions"))
                                    .timeout(Duration.ofSeconds(90))
                                    .header(
                                            "Authorization",
                                            "Bearer " + cipher.decrypt(s.getApiKeyCipher()))
                                    .header("Content-Type", "application/json")
                                    .POST(
                                            HttpRequest.BodyPublishers.ofString(
                                                    json.writeValueAsString(body)))
                                    .build(),
                            HttpResponse.BodyHandlers.ofString());
            long latency = (System.nanoTime() - started) / 1_000_000;
            if (res.statusCode() == 401 || res.statusCode() == 403)
                throw SystemException.serviceUnavailable(
                        "Gateway rejected the API key", "AI_ROUTER_UNAUTHORIZED");
            if (res.statusCode() == 429)
                throw SystemException.serviceUnavailable(
                        "Gateway is rate limiting", "AI_ROUTER_BUSY");
            if (res.statusCode() >= 400)
                throw SystemException.serviceUnavailable(
                        "Gateway error " + res.statusCode(), "AI_ROUTER_ERROR");
            JsonNode root = json.readTree(res.body());
            String reply =
                    root.path("choices").path(0).path("message").path("content").asText("").trim();
            if (reply.isEmpty())
                throw SystemException.serviceUnavailable(
                        "Gateway returned no answer", "AI_ROUTER_EMPTY");
            JsonNode usage = root.path("usage");
            AssistantChatResponse answer = new AssistantChatResponse(
                    reply,
                    r.mode(),
                    root.path("model").asText(model),
                    latency,
                    usage.hasNonNull("prompt_tokens") ? usage.get("prompt_tokens").asInt() : null,
                    usage.hasNonNull("completion_tokens")
                            ? usage.get("completion_tokens").asInt()
                            : null,
                    thread == null ? null : thread.conversationId());
            if (thread != null) conversations.recordReply(thread.conversationId(), answer);
            return answer;
        } catch (HttpTimeoutException e) {
            throw SystemException.serviceUnavailable("Gateway timed out", "AI_ROUTER_TIMEOUT");
        } catch (IOException e) {
            throw SystemException.serviceUnavailable(
                    "Gateway unreachable", "AI_ROUTER_UNREACHABLE");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw SystemException.serviceUnavailable("Interrupted", "AI_ROUTER_UNREACHABLE");
        }
    }

    void throttle(String user) {
        long now = System.currentTimeMillis();
        Deque<Long> calls = recentCalls.computeIfAbsent(user, k -> new ArrayDeque<>());
        synchronized (calls) {
            while (!calls.isEmpty() && now - calls.peekFirst() > 60_000) calls.pollFirst();
            if (calls.size() >= CHAT_LIMIT_PER_MINUTE)
                throw SystemException.badRequest(
                        "Too many messages, wait a moment", "AI_ROUTER_RATE_LIMIT");
            calls.addLast(now);
        }
    }
}
