package com.uav.platform;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.controller.maintenance.MaintenanceController;
import com.uav.platform.controller.user.UserController;
import com.uav.platform.dto.request.maintenance.MaintenanceScheduleQueryRequest;
import com.uav.platform.dto.request.maintenance.RepairOrderQueryRequest;
import com.uav.platform.enums.maintenance.DueStatus;
import com.uav.platform.enums.maintenance.RepairStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.user.UserServiceImpl;
import com.uav.platform.service.maintenance.MaintenanceService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/** HTTP query behavior must survive structural changes without changing binding or defaults. */
class QueryDtoContractTest {
    private UserRepository users;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        users = mock(UserRepository.class);
        when(users.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(call -> Page.empty(call.getArgument(1, Pageable.class)));
        mvc =
                MockMvcBuilders.standaloneSetup(new UserController(new UserServiceImpl(users)))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
    }

    @Test
    void omittedQueryKeepsExistingDefaultsAndPageShape() throws Exception {
        mvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.content").isArray());
        assertEquals(Sort.by(Sort.Direction.DESC, "createdAt"), capturedPage().getSort());
    }

    @Test
    void emptyQueryStillUsesRequestParameterDefaults() throws Exception {
        mvc.perform(
                        get("/api/v1/users")
                                .param("page", "")
                                .param("size", "")
                                .param("sortBy", "")
                                .param("direction", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(10));
        assertEquals(Sort.by(Sort.Direction.DESC, "createdAt"), capturedPage().getSort());
    }

    @Test
    void paginationClampingAndSortAllowlistStayAtTheServiceBoundary() throws Exception {
        mvc.perform(
                        get("/api/v1/users")
                                .param("page", "-3")
                                .param("size", "500")
                                .param("sortBy", "not_a_column")
                                .param("direction", "asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(100));
        assertEquals(Sort.by(Sort.Direction.ASC, "createdAt"), capturedPage().getSort());
    }

    @Test
    void malformedQueryKeepsExistingParameterErrorAndNeverQueriesUsers() throws Exception {
        mvc.perform(get("/api/v1/users").param("page", "bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        mvc.perform(get("/api/v1/users").param("role", "not_a_role"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        verifyNoInteractions(users);
    }

    private Pageable capturedPage() {
        var captor = ArgumentCaptor.forClass(Pageable.class);
        verify(users).findAll(any(Specification.class), captor.capture());
        return captor.getValue();
    }

    @Test
    void maintenanceQueriesKeepTheirFilterNamesAndPaginationDefaults() throws Exception {
        var service = mock(MaintenanceService.class);
        when(service.schedules(any(), any())).thenReturn(PageResponse.from(Page.empty()));
        when(service.orders(any(), any())).thenReturn(PageResponse.from(Page.empty()));
        var maintenance =
                MockMvcBuilders.standaloneSetup(new MaintenanceController(service))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        maintenance
                .perform(
                        get("/api/v1/maintenance/schedules")
                                .param("uavId", "7")
                                .param("dueStatus", "OVERDUE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
        maintenance
                .perform(
                        get("/api/v1/maintenance/orders")
                                .param("uavId", "8")
                                .param("status", "IN_PROGRESS")
                                .param("page", "1")
                                .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
        verify(service)
                .schedules(
                        new MaintenanceScheduleQueryRequest(7L, DueStatus.OVERDUE),
                        Pageables.strictDesc(0, 20, "id", "MAINTENANCE_INVALID_PAGE"));
        verify(service)
                .orders(
                        new RepairOrderQueryRequest(8L, RepairStatus.IN_PROGRESS),
                        Pageables.strictDesc(1, 5, "id", "MAINTENANCE_INVALID_PAGE"));
    }

    @Test
    void absentMaintenanceFiltersRemainNullAndEmptyPagingRetainsDefaults() throws Exception {
        var service = mock(MaintenanceService.class);
        var maintenance =
                MockMvcBuilders.standaloneSetup(new MaintenanceController(service)).build();
        maintenance
                .perform(get("/api/v1/maintenance/schedules").param("page", "").param("size", ""))
                .andExpect(status().isOk());
        maintenance.perform(get("/api/v1/maintenance/orders")).andExpect(status().isOk());
        var page = Pageables.strictDesc(0, 20, "id", "MAINTENANCE_INVALID_PAGE");
        verify(service).schedules(new MaintenanceScheduleQueryRequest(null, null), page);
        verify(service).orders(new RepairOrderQueryRequest(null, null), page);
    }

    @Test
    void maintenanceStillRejectsStrictPaginationAndMalformedEnumsBeforeCallingService()
            throws Exception {
        var service = mock(MaintenanceService.class);
        var maintenance =
                MockMvcBuilders.standaloneSetup(new MaintenanceController(service))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        maintenance
                .perform(get("/api/v1/maintenance/schedules").param("page", "-1"))
                .andExpect(status().isBadRequest());
        maintenance
                .perform(get("/api/v1/maintenance/orders").param("size", "101"))
                .andExpect(status().isBadRequest());
        maintenance
                .perform(get("/api/v1/maintenance/schedules").param("dueStatus", "unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        maintenance
                .perform(get("/api/v1/maintenance/orders").param("status", "unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST_PARAMETER"));
        verifyNoInteractions(service);
    }
}
