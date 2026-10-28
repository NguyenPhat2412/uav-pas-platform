package com.uav.platform.modules.assistant.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.assistant.dto.request.AiRouterSettingsRequest;
import com.uav.platform.modules.assistant.dto.request.AssistantChatRequest;
import com.uav.platform.modules.assistant.dto.request.AssistantMessageRequest;
import com.uav.platform.modules.assistant.entity.AiRouterSettings;
import com.uav.platform.modules.assistant.repository.AiRouterSettingsRepository;
import com.uav.platform.modules.assistant.service.impl.AiRouterServiceImpl;
import com.uav.platform.modules.assistant.service.impl.SecretCipherOperations;
import com.uav.platform.modules.audit.service.AuditLogService;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.lang.reflect.Constructor;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Optional;

class AiRouterServiceTest {
    final AiRouterSettingsRepository repo = mock(AiRouterSettingsRepository.class);
    final HttpClient http = mock(HttpClient.class);
    final SecretCipherOperations cipher = new SecretCipherOperations("test-secret");
    final AiRouterServiceImpl service = build();
    final UsernamePasswordAuthenticationToken admin =
            new UsernamePasswordAuthenticationToken("admin", "", List.of());
    final AiRouterSettings row = new AiRouterSettings();

    AiRouterServiceImpl build() {
        try {
            Constructor<AiRouterServiceImpl> c =
                    AiRouterServiceImpl.class.getDeclaredConstructor(
                            AiRouterSettingsRepository.class,
                            AuditLogService.class,
                            ObjectMapper.class,
                            SecretCipherOperations.class,
                            HttpClient.class);
            c.setAccessible(true);
            return c.newInstance(
                    repo, mock(AuditLogService.class), new ObjectMapper(), cipher, http);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    {
        row.setId(AiRouterSettings.SINGLETON_ID);
        row.setBaseUrl("https://router.example.test/v1");
        row.setMode1Label("Nhanh");
        row.setMode2Label("Chuyên sâu");
        when(repo.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private AiRouterSettingsRequest req(String key, String m1, boolean enabled) {
        return new AiRouterSettingsRequest(
                "https://router.example.test/v1/",
                key,
                "Nhanh",
                m1,
                "Chuyên sâu",
                null,
                "Be brief",
                enabled,
                0L);
    }

    @Test
    void cipherRoundTripsAndDetectsTampering() {
        String sealed = cipher.encrypt("sk-live-123456");
        assertNotEquals(sealed, cipher.encrypt("sk-live-123456"), "random IV per encryption");
        assertEquals("sk-live-123456", cipher.decrypt(sealed));
        char[] c = sealed.toCharArray();
        c[c.length / 2] = c[c.length / 2] == 'A' ? 'B' : 'A';
        assertThrows(IllegalStateException.class, () -> cipher.decrypt(new String(c)));
        assertThrows(
                IllegalStateException.class,
                () -> new SecretCipherOperations("other").decrypt(sealed));
    }

    @Test
    void keyIsStoredEncryptedAndNeverEchoed() {
        var res = service.update(req("sk-abcdef9876", "cc/claude-sonnet", true), admin);
        assertTrue(res.apiKeyConfigured());
        assertEquals("9876", res.apiKeyHint());
        assertEquals("https://router.example.test/v1", res.baseUrl());
        assertNotEquals("sk-abcdef9876", row.getApiKeyCipher());
        assertEquals("sk-abcdef9876", cipher.decrypt(row.getApiKeyCipher()));
        assertFalse(res.toString().contains("sk-abcdef9876"));
        service.update(req(null, "cc/claude-sonnet", true), admin);
        assertNotNull(row.getApiKeyCipher(), "null keeps the stored key");
        service.update(req("", "cc/claude-sonnet", false), admin);
        assertNull(row.getApiKeyCipher(), "empty string disconnects");
    }

    @Test
    void enablingNeedsKeyAndModelAndVersionMustMatch() {
        assertThrows(SystemException.class, () -> service.update(req(null, "m", true), admin));
        assertThrows(
                SystemException.class, () -> service.update(req("sk-x12345", null, true), admin));
        row.setVersion(3);
        assertThrows(
                SystemException.class, () -> service.update(req("sk-x12345", "m", true), admin));
    }

    @Test
    @SuppressWarnings("unchecked")
    void chatSendsConfiguredModelAndMapsErrors() throws Exception {
        row.setApiKeyCipher(cipher.encrypt("sk-test-0001"));
        row.setMode1Model("cc/claude-haiku");
        row.setSystemPrompt("Be brief");
        row.setEnabled(true);
        HttpResponse<String> ok = mock(HttpResponse.class);
        when(ok.statusCode()).thenReturn(200);
        when(ok.body())
                .thenReturn(
                        "{\"model\":\"cc/claude-haiku\",\"choices\":[{\"message\":{\"content\":\" Xin chào! \"}}],\"usage\":{\"prompt_tokens\":12,\"completion_tokens\":3}}");
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn((HttpResponse<Object>) (HttpResponse<?>) ok);
        var chat = new AssistantChatRequest(1, List.of(new AssistantMessageRequest("user", "hi")));
        var res = service.chat(chat, admin);
        assertEquals("Xin chào!", res.reply());
        assertEquals(12, res.promptTokens());
        assertFalse(AiRouterServiceImplGuide.guide().isBlank(), "platform guide is bundled");
        assertTrue(AiRouterServiceImplGuide.guide().contains("PENDING_CONFIRMATION"));
        verify(http)
                .send(
                        argThat(
                                r ->
                                        r.uri()
                                                        .toString()
                                                        .equals(
                                                                "https://router.example.test/v1/chat/completions")
                                                && r.headers()
                                                        .firstValue("Authorization")
                                                        .orElse("")
                                                        .equals("Bearer sk-test-0001")),
                        any());

        when(ok.statusCode()).thenReturn(401);
        SystemException e = assertThrows(SystemException.class, () -> service.chat(chat, admin));
        assertTrue(e.getMessage().contains("API key"));
        assertThrows(
                SystemException.class,
                () -> service.chat(new AssistantChatRequest(2, chat.messages()), admin),
                "mode 2 has no model");
        row.setEnabled(false);
        assertThrows(SystemException.class, () -> service.chat(chat, admin));
    }

    @Test
    void infoHidesModesWithoutModelAndThrottleCaps() {
        row.setMode2Model("cc/claude-opus");
        var info = service.info();
        assertFalse(info.enabled());
        assertEquals(1, info.modes().size());
        assertEquals(2, info.modes().get(0).mode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void twentyFirstMessageInAMinuteIsRejected() throws Exception {
        row.setApiKeyCipher(cipher.encrypt("sk-test-0001"));
        row.setMode1Model("cc/claude-haiku");
        row.setEnabled(true);
        HttpResponse<String> ok = mock(HttpResponse.class);
        when(ok.statusCode()).thenReturn(200);
        when(ok.body()).thenReturn("{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}");
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn((HttpResponse<Object>) (HttpResponse<?>) ok);
        var chat = new AssistantChatRequest(1, List.of(new AssistantMessageRequest("user", "x")));
        for (int i = 0; i < 20; i++) service.chat(chat, admin);
        SystemException e = assertThrows(SystemException.class, () -> service.chat(chat, admin));
        assertTrue(e.getMessage().contains("Too many"));
        verify(http, times(20)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void chatRecordsTheTurnAndTellsTheModelWhoIsAsking() throws Exception {
        row.setApiKeyCipher(cipher.encrypt("sk-test-0001"));
        row.setMode1Model("cc/claude-haiku");
        row.setEnabled(true);
        AssistantConversationService store = mock(AssistantConversationService.class);
        when(store.begin(any(), eq("CUSTOMER"), isNull(), eq("Làm sao thanh toán?"), any()))
                .thenReturn(
                        new com.uav.platform.modules.assistant.dto.record.ChatThread(
                                77L, "CUSTOMER"));
        var setter =
                AiRouterServiceImpl.class.getDeclaredMethod(
                        "setConversations", AssistantConversationService.class);
        setter.setAccessible(true);
        setter.invoke(service, store);
        HttpResponse<String> ok = mock(HttpResponse.class);
        when(ok.statusCode()).thenReturn(200);
        when(ok.body())
                .thenReturn(
                        "{\"choices\":[{\"message\":{\"content\":\"Chuyển khoản VietQR\"}}],\"usage\":{\"prompt_tokens\":5,\"completion_tokens\":2}}");
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn((HttpResponse<Object>) (HttpResponse<?>) ok);
        var res =
                service.chat(
                        new AssistantChatRequest(
                                1,
                                List.of(new AssistantMessageRequest("user", "Làm sao thanh toán?")),
                                null,
                                "CUSTOMER"),
                        admin);
        assertEquals(77L, res.conversationId());
        verify(store).recordReply(eq(77L), argThat(a -> a.reply().equals("Chuyển khoản VietQR")));
        var sent = org.mockito.ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(sent.capture(), any());
        var body = new java.io.ByteArrayOutputStream();
        var sub =
                new java.util.concurrent.Flow.Subscriber<java.nio.ByteBuffer>() {
                    public void onSubscribe(java.util.concurrent.Flow.Subscription s) {
                        s.request(Long.MAX_VALUE);
                    }

                    public void onNext(java.nio.ByteBuffer b) {
                        byte[] a = new byte[b.remaining()];
                        b.get(a);
                        body.writeBytes(a);
                    }

                    public void onError(Throwable t) {}

                    public void onComplete() {}
                };
        sent.getValue().bodyPublisher().orElseThrow().subscribe(sub);
        assertTrue(
                body.toString(java.nio.charset.StandardCharsets.UTF_8).contains("KHÁCH HÀNG"),
                "customer audience note sent");
    }
}
