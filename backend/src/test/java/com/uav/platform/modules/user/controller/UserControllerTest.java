package com.uav.platform.modules.user.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.user.dto.request.UserQueryRequest;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.service.UserService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserController MockMvc REST Tests")
class UserControllerTest {

    @Mock private UserService userService;

    @InjectMocks private UserController userController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc =
                MockMvcBuilders.standaloneSetup(userController)
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
    }

    @Test
    @DisplayName("GET /api/v1/users should return 200 with PageResponse")
    void getUsers_ReturnsPageResponse() throws Exception {
        UserResponse user =
                new UserResponse(
                        1L,
                        "pilot_alpha",
                        "alpha@uav.vn",
                        "0900000001",
                        UserStatus.ACTIVE,
                        LocalDateTime.now());
        PageResponse<UserResponse> pageResponse =
                new PageResponse<>(List.of(user), 0, 10, 1, 1, true, true, false, false);

        when(userService.getUsers(new UserQueryRequest(0, 10, "createdAt", "desc", null, null)))
                .thenReturn(pageResponse);

        mockMvc.perform(
                        get(RestEndpoint.USERS)
                                .param("page", "0")
                                .param("size", "10")
                                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].username").value("pilot_alpha"));
    }

    @Test
    @DisplayName("GET /api/v1/users/{id} should return 200 when user found")
    void getUserById_Found_Returns200() throws Exception {
        UserResponse user =
                new UserResponse(
                        2L,
                        "commander_01",
                        "cmd@uav.vn",
                        "0900000002",
                        UserStatus.ACTIVE,
                        LocalDateTime.now());
        when(userService.getUserById(2L)).thenReturn(user);

        mockMvc.perform(get(RestEndpoint.USERS + "/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.username").value("commander_01"));
    }

    @Test
    @DisplayName("GET /api/v1/users/{id} should return 404 when user not found")
    void getUserById_NotFound_Returns404() throws Exception {
        when(userService.getUserById(999L)).thenThrow(SystemException.notFound("User not found"));

        mockMvc.perform(get(RestEndpoint.USERS + "/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
