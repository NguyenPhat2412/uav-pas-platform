package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dao.IAiRouterSettingsDao;
import com.uav.platform.dto.record.ChatThread;
import com.uav.platform.dto.request.AiRouterSettingsRequest;
import com.uav.platform.dto.request.AssistantAttachmentRequest;
import com.uav.platform.dto.request.AssistantChatRequest;
import com.uav.platform.dto.request.AssistantMessageRequest;
import com.uav.platform.dto.response.AiRouterSettingsResponse;
import com.uav.platform.dto.response.AiRouterStatusResponse;
import com.uav.platform.dto.response.AssistantChatResponse;
import com.uav.platform.dto.response.AssistantInfoResponse;
import com.uav.platform.entity.AiRouterSettings;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.AssistantConversationService;
import com.uav.platform.service.AuditLogService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

class AiRouterServiceImplCoverageTest {

    private static final String PNG_B64 =
            Base64.getEncoder()
                    .encodeToString(new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0});

    private IAiRouterSettingsDao repository;
    private AuditLogService audit;
    private SecretCipherOperations cipher;
    private HttpClient http;
    private AiRouterServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(IAiRouterSettingsDao.class);
        audit = mock(AuditLogService.class);
        cipher = new SecretCipherOperations("test-secret-material");
        http = mock(HttpClient.class);
        service = new AiRouterServiceImpl(repository, audit, new ObjectMapper(), cipher, http);
    }

    private static Authentication auth(String name) {
        return UsernamePasswordAuthenticationToken.authenticated(name, null, List.of());
    }

    private AiRouterSettings settingsRow(boolean enabled, boolean withKey) {
        AiRouterSettings s = new AiRouterSettings();
        s.setId(AiRouterSettings.SINGLETON_ID);
        s.setBaseUrl("https://router.uav.vn/v1");
        if (withKey) {
            s.setApiKeyCipher(cipher.encrypt("sk-12345678"));
            s.setApiKeyHint("5678");
        }
        s.setMode1Label("Fast");
        s.setMode1Model("fast-model");
        s.setMode2Label("Deep");
        s.setMode2Model("deep-model");
        s.setSystemPrompt("Be helpful");
        s.setEnabled(enabled);
        s.setVersion(1L);
        return s;
    }

    private static HttpResponse<String> response(int status, String body) {
        return new HttpResponse<>() {
            @Override
            public int statusCode() {
                return status;
            }

            @Override
            public HttpRequest request() {
                return null;
            }

            @Override
            public Optional<HttpResponse<String>> previousResponse() {
                return Optional.empty();
            }

            @Override
            public java.net.http.HttpHeaders headers() {
                return java.net.http.HttpHeaders.of(java.util.Map.of(), (a, b) -> true);
            }

            @Override
            public String body() {
                return body;
            }

            @Override
            public Optional<javax.net.ssl.SSLSession> sslSession() {
                return Optional.empty();
            }

            @Override
            public java.net.URI uri() {
                return java.net.URI.create("https://router.uav.vn");
            }

            @Override
            public HttpClient.Version version() {
                return HttpClient.Version.HTTP_1_1;
            }
        };
    }

    @Test
    void springConstructorsAudienceNotesAndSettingsLookup() {
        AiRouterServiceImpl fallbackSecret =
                new AiRouterServiceImpl(repository, audit, "", "jwt-fallback-secret");
        AiRouterServiceImpl explicitSecret =
                new AiRouterServiceImpl(repository, audit, "explicit-secret", "jwt-secret");
        assertNotNull(fallbackSecret);
        assertNotNull(explicitSecret);

        assertTrue(AiRouterServiceImpl.audienceNote("CUSTOMER").contains("KHÁCH HÀNG"));
        assertTrue(AiRouterServiceImpl.audienceNote("OPERATIONS").contains("VẬN HÀNH"));
        assertTrue(AiRouterServiceImpl.audienceNote("ADMIN").contains("QUẢN TRỊ VIÊN"));
        assertEquals("", AiRouterServiceImpl.audienceNote(null));
        assertEquals("", AiRouterServiceImpl.audienceNote("UNKNOWN"));

        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, service::settings);

        AiRouterSettings row = settingsRow(true, true);
        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
        AiRouterSettingsResponse resp = service.settings();
        assertTrue(resp.apiKeyConfigured());
        assertEquals("5678", resp.apiKeyHint());
    }

    @Test
    void updateCoversVersionGuardUnsafeUrlKeyChangesAndValidation() {
        when(repository.save(any(AiRouterSettings.class))).thenAnswer(inv -> inv.getArgument(0));

        // Stale version
        when(repository.findById(AiRouterSettings.SINGLETON_ID))
                .thenReturn(Optional.of(settingsRow(false, true)));
        assertThrows(
                SystemException.class,
                () ->
                        service.update(
                                new AiRouterSettingsRequest(
                                        "https://router.uav.vn/v1",
                                        null,
                                        "Fast",
                                        "m1",
                                        "Deep",
                                        "m2",
                                        "",
                                        false,
                                        99L),
                                auth("admin")));

        // Unsafe loopback gateway
        assertThrows(
                SystemException.class,
                () ->
                        service.update(
                                new AiRouterSettingsRequest(
                                        "https://127.0.0.1/v1",
                                        "sk-abcde",
                                        "Fast",
                                        "m1",
                                        "Deep",
                                        "m2",
                                        null,
                                        false,
                                        1L),
                                auth("admin")));

        // Changing baseUrl with enabled=true and apiKey=null -> requires reentry
        assertThrows(
                SystemException.class,
                () ->
                        service.update(
                                new AiRouterSettingsRequest(
                                        "https://other.uav.vn/v1/",
                                        null,
                                        "Fast",
                                        "m1",
                                        "Deep",
                                        "m2",
                                        null,
                                        true,
                                        1L),
                                auth("admin")));

        // Changing baseUrl with enabled=false and apiKey=null -> clears stored key
        AiRouterSettings row1 = settingsRow(false, true);
        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row1));
        AiRouterSettingsResponse cleared =
                service.update(
                        new AiRouterSettingsRequest(
                                "https://other.uav.vn/v1/",
                                null,
                                "Fast",
                                "m1",
                                "Deep",
                                " ",
                                " ",
                                false,
                                1L),
                        auth("admin"));
        assertFalse(cleared.apiKeyConfigured());
        assertEquals("https://other.uav.vn/v1", cleared.baseUrl());

        // Blank apiKey clears key; enabling without key fails
        AiRouterSettings row2 = settingsRow(false, true);
        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row2));
        assertThrows(
                SystemException.class,
                () ->
                        service.update(
                                new AiRouterSettingsRequest(
                                        "https://router.uav.vn/v1",
                                        "   ",
                                        "Fast",
                                        "m1",
                                        "Deep",
                                        null,
                                        null,
                                        true,
                                        1L),
                                auth("admin")));

        // Enabling with key but no models fails
        AiRouterSettings row3 = settingsRow(false, false);
        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row3));
        assertThrows(
                SystemException.class,
                () ->
                        service.update(
                                new AiRouterSettingsRequest(
                                        "https://router.uav.vn/v1",
                                        "abcd",
                                        "Fast",
                                        "",
                                        "Deep",
                                        null,
                                        null,
                                        true,
                                        1L),
                                auth("admin")));

        // Short key (<=4 chars) produces null hint; long key produces 4-char hint; same URL keeps
        // key
        AiRouterSettings row4 = settingsRow(false, false);
        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row4));
        AiRouterSettingsResponse shortRes =
                service.update(
                        new AiRouterSettingsRequest(
                                "https://router.uav.vn/v1",
                                "abcd",
                                "Fast",
                                "m1",
                                "Deep",
                                "m2",
                                "prompt",
                                true,
                                1L),
                        auth("admin"));
        assertTrue(shortRes.apiKeyConfigured());
        assertNull(shortRes.apiKeyHint());

        AiRouterSettingsResponse keepRes =
                service.update(
                        new AiRouterSettingsRequest(
                                "https://router.uav.vn/v1",
                                null,
                                "Fast",
                                "m1",
                                "Deep",
                                "m2",
                                "prompt",
                                true,
                                1L),
                        auth("admin"));
        assertTrue(keepRes.enabled());
    }

    @Test
    @SuppressWarnings("unchecked")
    void statusCoversHealthErrorsNoKeyModelsStatusSuccessAndExceptions() throws Exception {
        AiRouterSettings row = settingsRow(true, true);
        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row));

        // 1. Health 503
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(503, ""));
        AiRouterStatusResponse s1 = service.status();
        assertFalse(s1.reachable());
        assertEquals("HTTP_503", s1.error());

        // 2. Health 200, no key
        row.setApiKeyCipher(null);
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(200, "ok"));
        AiRouterStatusResponse s2 = service.status();
        assertTrue(s2.reachable());
        assertEquals("AI_ROUTER_NO_KEY", s2.error());

        // 3. Models 401 & 500
        row.setApiKeyCipher(cipher.encrypt("sk-12345678"));
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(200, "ok"))
                .thenReturn(response(401, ""));
        assertEquals("AI_ROUTER_UNAUTHORIZED", service.status().error());

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(200, "ok"))
                .thenReturn(response(500, ""));
        assertEquals("HTTP_500", service.status().error());

        // 4. Models 200 sorted + ignores empty ids, baseUrl without /v1
        row.setBaseUrl("https://router.uav.vn");
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(200, "ok"))
                .thenReturn(
                        response(
                                200,
                                "{\"data\":[{\"id\":\"z-mod\"},{\"id\":\"\"},{\"id\":\"a-mod\"}]}"));
        AiRouterStatusResponse ok = service.status();
        assertTrue(ok.authenticated());
        assertEquals(List.of("a-mod", "z-mod"), ok.models());

        // 5. Timeout, IOException, InterruptedException
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpTimeoutException("slow"));
        assertEquals("AI_ROUTER_TIMEOUT", service.status().error());

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("down"));
        assertEquals("AI_ROUTER_UNREACHABLE", service.status().error());

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new InterruptedException("int"));
        assertEquals("AI_ROUTER_UNREACHABLE", service.status().error());
        assertTrue(Thread.interrupted());
    }

    @Test
    @SuppressWarnings("unchecked")
    void infoAndChatCoverValidationMultimodalConversationsErrorsAndRateLimit() throws Exception {
        AiRouterSettings row = settingsRow(true, true);
        when(repository.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row));

        AssistantInfoResponse info = service.info();
        assertTrue(info.enabled());
        assertEquals(2, info.modes().size());

        // Disabled -> serviceUnavailable
        row.setEnabled(false);
        AssistantChatRequest simpleReq =
                new AssistantChatRequest(1, List.of(new AssistantMessageRequest("user", "Hello")));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u1")));

        // Mode unset -> badRequest
        row.setEnabled(true);
        row.setMode2Model(null);
        AssistantChatRequest mode2Req =
                new AssistantChatRequest(2, List.of(new AssistantMessageRequest("user", "Hello")));
        assertThrows(SystemException.class, () -> service.chat(mode2Req, auth("u1")));

        // Last message not user -> badRequest
        AssistantChatRequest badTurn =
                new AssistantChatRequest(
                        1, List.of(new AssistantMessageRequest("assistant", "Hi")));
        assertThrows(SystemException.class, () -> service.chat(badTurn, auth("u2")));

        // Success with conversations + multimodal image + usage tokens
        AssistantConversationService convService = mock(AssistantConversationService.class);
        service.setConversations(convService);
        when(convService.begin(any(), eq("ADMIN"), isNull(), eq("Inspect this"), any()))
                .thenReturn(new ChatThread(77L, "ADMIN"));
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(
                        response(
                                200,
                                "{\"model\":\"gpt-ok\",\"choices\":[{\"message\":{\"content\":\"  All clear  \"}}],\"usage\":{\"prompt_tokens\":12,\"completion_tokens\":34}}"));

        AssistantChatRequest multiReq =
                new AssistantChatRequest(
                        1,
                        List.of(
                                new AssistantMessageRequest("assistant", "Ready"),
                                new AssistantMessageRequest("user", "Inspect this")),
                        null,
                        "ADMIN",
                        List.of(new AssistantAttachmentRequest("IMAGE", "frame.png", PNG_B64)));
        AssistantChatResponse answer = service.chat(multiReq, auth("u3"));
        assertEquals("All clear", answer.reply());
        assertEquals("gpt-ok", answer.model());
        assertEquals(12, answer.promptTokens());
        assertEquals(34, answer.completionTokens());
        assertEquals(77L, answer.conversationId());
        verify(convService).recordReply(eq(77L), eq(answer));

        // Gateway error codes: 401, 429, 500, empty reply, timeout, IO, Interrupted
        service.setConversations(null);
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(403, ""));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u4")));

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(429, ""));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u5")));

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(502, ""));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u6")));

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(response(200, "{\"choices\":[{\"message\":{\"content\":\"   \"}}]}"));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u7")));

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new HttpTimeoutException("slow"));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u8")));

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("down"));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u9")));

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new InterruptedException("stop"));
        assertThrows(SystemException.class, () -> service.chat(simpleReq, auth("u10")));
        assertTrue(Thread.interrupted());

        // Rate limit: 20 calls allowed, 21st rejected
        for (int i = 0; i < AiRouterServiceImpl.CHAT_LIMIT_PER_MINUTE; i++) {
            service.throttle("spammer");
        }
        assertThrows(SystemException.class, () -> service.throttle("spammer"));
    }
}
