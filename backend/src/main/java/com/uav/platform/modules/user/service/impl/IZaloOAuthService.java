package com.uav.platform.modules.user.service.impl;


import com.uav.platform.modules.user.common.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.modules.user.config.response.ZaloUserProfile;
import com.uav.platform.modules.user.service.ZaloOAuthService;
import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class IZaloOAuthService implements ZaloOAuthService {

    private static final Logger log = LoggerFactory.getLogger(IZaloOAuthService.class);

    private static final String ZALO_AUTH_ENDPOINT = "https://oauth.zaloapp.com/v4/permission";
    private static final String ZALO_ACCESS_TOKEN_ENDPOINT = "https://oauth.zaloapp.com/v4/access_token";
    private static final String ZALO_PROFILE_ENDPOINT = "https://graph.zalo.me/v2.0/me?fields=id,name,picture";

    private final String appId;
    private final String appSecret;
    private final String redirectUri;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired
    public IZaloOAuthService(
            @Value("${zalo.app-id:${app.zalo.app-id:}}") String appId,
            @Value("${zalo.app-secret:${app.zalo.secret-key:}}") String appSecret,
            @Value("${zalo.redirect-uri:${app.zalo.redirect-uri:http://localhost:3000/auth/zalo/callback}}") String redirectUri
    ) {
        this(appId, appSecret, redirectUri, new RestTemplate(), new ObjectMapper());
    }

    public IZaloOAuthService(
            String appId,
            String appSecret,
            String redirectUri,
            RestTemplate restTemplate,
            ObjectMapper objectMapper
    ) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.redirectUri = redirectUri;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getAuthorizationUrl() {
        if (isConfigured()) {
            String encodedRedirect = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
            return ZALO_AUTH_ENDPOINT + "?app_id=" + appId + "&redirect_uri=" + encodedRedirect + "&state=uav_pas_state";
        }
        return redirectUri + (redirectUri.contains("?") ? "&" : "?") + "code=mock_zalo_code";
    }

    @Override
    public ZaloUserProfile authenticateWithZalo(String code) {
        if (code == null || code.isBlank()) {
            throw SystemException.badRequest("Zalo authorization code is required");
        }

        if (isMockMode(code)) {
            log.info("Zalo credentials not configured or mock code used. Returning mock Zalo profile for code: {}", code);
            String mockId = "mock_zalo_" + Math.abs(code.hashCode());
            return new ZaloUserProfile(mockId, "Zalo Test User", "https://avatar.talk.zdn.vn/default.jpg");
        }

        try {
            String accessToken = exchangeCodeForAccessToken(code);
            return fetchUserProfile(accessToken);
        } catch (SystemException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to authenticate with Zalo OA API: {}", ex.getMessage(), ex);
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }
    }

    private boolean isConfigured() {
        return appId != null && !appId.isBlank() && !"mock".equalsIgnoreCase(appId)
                && appSecret != null && !appSecret.isBlank() && !"mock".equalsIgnoreCase(appSecret);
    }

    private boolean isMockMode(String code) {
        return !isConfigured() || code.startsWith("mock");
    }

    private String exchangeCodeForAccessToken(String code) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("secret_key", appSecret);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", code);
        body.add("app_id", appId);
        body.add("grant_type", "authorization_code");
        body.add("redirect_uri", redirectUri);

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(ZALO_ACCESS_TOKEN_ENDPOINT, requestEntity, String.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        if (root.has("error") && root.get("error").asInt() != 0) {
            log.warn("Zalo access token error response: {}", response.getBody());
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }

        JsonNode tokenNode = root.get("access_token");
        if (tokenNode == null || tokenNode.asText().isBlank()) {
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }

        return tokenNode.asText();
    }

    private ZaloUserProfile fetchUserProfile(String accessToken) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("access_token", accessToken);

        HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
                ZALO_PROFILE_ENDPOINT,
                HttpMethod.GET,
                requestEntity,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        if (root.has("error") && root.get("error").asInt() != 0) {
            log.warn("Zalo get profile error response: {}", response.getBody());
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }

        String id = root.path("id").asText();
        String name = root.path("name").asText("Zalo User");
        String avatar = root.path("picture").path("data").path("url").asText("https://avatar.talk.zdn.vn/default.jpg");

        if (id == null || id.isBlank()) {
            throw SystemException.badRequest(CoreConstants.ZALO_AUTH_FAILED);
        }

        return new ZaloUserProfile(id, name, avatar);
    }
}
