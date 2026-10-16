package com.uav.platform.error;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.util.List;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class UnknownRouteIntegrationTest {
    @Autowired WebApplicationContext context;
    private MockMvc mvc;
    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context)
                .defaultRequest(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
                .apply(springSecurity()).build(); }

    @ParameterizedTest @ValueSource(strings = {"/api/v1/route-that-does-not-exist", "/api/v1/uavs/1/station", "/missing-static-asset.svg"})
    void authenticatedUnknownGetReturns404WithSafeErrorEnvelope(String path) throws Exception {
        mvc.perform(get(path).queryParam("diagnostic", "do-not-reflect-query")
                .with(authentication(UsernamePasswordAuthenticationToken.authenticated("synthetic", "n/a", List.of()))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.path").value(path))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("do-not-reflect-query"))));
    }

    @Test void authenticatedUnknownWriteReturns404() throws Exception {
        mvc.perform(post("/api/v1/uavs/1/station?stationId=2")
                .with(authentication(UsernamePasswordAuthenticationToken.authenticated("synthetic", "n/a", List.of()))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test void protectedUnknownRouteKeepsAnonymous401() throws Exception {
        mvc.perform(get("/api/v1/route-that-does-not-exist")).andExpect(status().isUnauthorized());
    }

    @Test void unmappedDispatcherWithoutResourceHandlerAlsoReturns404() throws Exception {
        var standalone = MockMvcBuilders.standaloneSetup(new Object()).setControllerAdvice(new GlobalExceptionHandler()).build();
        standalone.perform(get("/no-handler"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
