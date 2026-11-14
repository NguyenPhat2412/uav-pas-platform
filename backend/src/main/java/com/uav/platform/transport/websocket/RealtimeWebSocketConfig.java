package com.uav.platform.transport.websocket;

import com.uav.platform.config.routes.ApiRoutes;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

/** Registers the authenticated/token-scoped WebSocket endpoint for support and billing updates. */
@Configuration
@EnableWebSocket
public class RealtimeWebSocketConfig implements WebSocketConfigurer {

    private final RealtimeWebSocketHandler handler;
    private final RealtimeHandshakeInterceptor handshakeInterceptor;
    private final String[] allowedOrigins;

    public RealtimeWebSocketConfig(
            RealtimeWebSocketHandler handler,
            RealtimeHandshakeInterceptor handshakeInterceptor,
            @Value("${app.cors.allowed-origins:http://localhost:3000}") String allowedOriginsCsv) {
        this.handler = handler;
        this.handshakeInterceptor = handshakeInterceptor;
        this.allowedOrigins =
                Arrays.stream(allowedOriginsCsv.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toArray(String[]::new);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, ApiRoutes.Realtime.ENDPOINT)
                .addInterceptors(handshakeInterceptor)
                .setAllowedOrigins(allowedOrigins);
    }
}
