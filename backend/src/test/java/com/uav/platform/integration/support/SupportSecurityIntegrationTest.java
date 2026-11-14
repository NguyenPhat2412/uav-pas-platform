package com.uav.platform.integration.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.user.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:platform_support_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class SupportSecurityIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired UserRepository users;
    private final ObjectMapper mapper = new ObjectMapper();

    private AppUser createUser(UserRole role, String fullName) {
        String s = UUID.randomUUID().toString().substring(0, 8);
        return users.save(
                new AppUser(
                        "sup_" + s,
                        "sup_" + s + "@example.invalid",
                        "synthetic-placeholder",
                        null,
                        fullName,
                        null,
                        role,
                        UserStatus.ACTIVE));
    }

    @Test
    void anonymousPublicChatBypassesCsrfAndAdminEndpointsEnforcePermissionsAndFilterQueries()
            throws Exception {
        MockMvc mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();

        AppUser admin = createUser(UserRole.ROLE_ADMIN, "Trưởng Trung tâm Điều phối");

        var adminAuth =
                new UsernamePasswordAuthenticationToken(
                        admin.getUsername(),
                        "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        var unprivilegedAuth =
                new UsernamePasswordAuthenticationToken(
                        "unprivileged_guest",
                        "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_GUEST")));

        // 1. Anonymous POST without CSRF or JWT succeeds with 201 Created
        String createdBody =
                mvc.perform(
                                post("/api/v1/public/support/threads")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {
                                                  "fullName": "Trần Quang Hải",
                                                  "organization": "Sở TNMT Quảng Ninh",
                                                  "contactInfo": "hai.tran@quangninh.gov.vn",
                                                  "topic": "SURVEY_SERVICE",
                                                  "source": "CONTACT_FORM",
                                                  "message": "Yêu cầu khảo sát 3D khu vực mỏ lộ thiên"
                                                }
                                                """))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.status").value("OPEN"))
                        .andExpect(jsonPath("$.messages.length()").value(1))
                        .andReturn()
                        .getResponse()
                        .getContentAsString();

        JsonNode created = mapper.readTree(createdBody);
        long threadId = created.get("threadId").asLong();
        String visitorToken = created.get("visitorToken").asText();

        // 2. Anonymous visitor follow-up message without CSRF succeeds
        mvc.perform(
                        post("/api/v1/public/support/threads/" + visitorToken + "/messages")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"Diện tích khoảng 85 ha\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages.length()").value(2));

        // 3. Admin endpoints reject anonymous (401) and unprivileged principal (403)
        mvc.perform(get("/api/v1/admin/support/summary")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/support/summary").with(authentication(unprivilegedAuth)))
                .andExpect(status().isForbidden());
        // A customer holds DASHBOARD_VIEW by default but must never read other visitors' threads.
        AppUser customer = createUser(UserRole.ROLE_PILOT, "Khách hàng thử");
        var customerAuth =
                new UsernamePasswordAuthenticationToken(
                        customer.getUsername(),
                        "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_PILOT")));
        mvc.perform(get("/api/v1/admin/support/summary").with(authentication(customerAuth)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/support/threads").with(authentication(customerAuth)))
                .andExpect(status().isForbidden());

        // 4. Admin lists filtered threads & inspects summary via real JPA queries
        mvc.perform(
                        get("/api/v1/admin/support/threads")
                                .param("status", "OPEN")
                                .param("topic", "SURVEY_SERVICE")
                                .param("unreadOnly", "true")
                                .param("q", "Quảng Ninh")
                                .with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].messageCount").value(2))
                .andExpect(jsonPath("$.content[0].unreadForAdmin").value(2));

        mvc.perform(get("/api/v1/admin/support/summary").with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadThreads").value(1))
                .andExpect(jsonPath("$.unreadMessages").value(2));

        // 5. Admin replies and deletes thread cleanly
        mvc.perform(
                        post("/api/v1/admin/support/threads/" + threadId + "/reply")
                                .with(csrf())
                                .with(authentication(adminAuth))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"content\":\"Đã tiếp nhận yêu cầu khảo sát mỏ.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.thread.status").value("IN_PROGRESS"))
                .andExpect(
                        jsonPath("$.messages[2].senderName").value("Trưởng Trung tâm Điều phối"));

        mvc.perform(
                        delete("/api/v1/admin/support/threads/" + threadId)
                                .with(csrf())
                                .with(authentication(adminAuth)))
                .andExpect(status().isNoContent());
    }
}
