package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.PermissionService;
import com.uav.platform.modules.mission.config.request.MissionCreateRequest;
import com.uav.platform.modules.mission.config.request.MissionFilter;
import com.uav.platform.modules.mission.config.response.MissionResponse;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.common.MissionStatus;
import com.uav.platform.modules.mission.common.MissionType;
import com.uav.platform.modules.mission.repository.MissionEventRepository;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.repository.UavServiceRepository;
import com.uav.platform.modules.mission.service.impl.IMissionService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MissionServiceTest {
    @Test
    void createsDraftWithStableCodeAndCreatedEvent() {
        MissionRepository missions = mock(MissionRepository.class);
        UserRepository users = mock(UserRepository.class);
        MissionEventRepository events = mock(MissionEventRepository.class);
        AppUser customer = new AppUser("customer", "customer@test.vn", "hash", null, UserStatus.ACTIVE);
        customer.setId(7L);
        when(users.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(missions.count()).thenReturn(0L);
        when(missions.save(any(Mission.class))).thenAnswer(invocation -> {
            Mission saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });

        MissionService service = new IMissionService(missions, mock(UavServiceRepository.class), users,
                mock(PermissionService.class), mock(AuditLogService.class), events);
        MissionResponse response = service.create(request(), "customer");

        assertEquals("MSN-2026-000001", response.code());
        assertEquals(MissionStatus.DRAFT, response.status());
        verify(events).save(any());
    }

    @Test
    void customerListUsesOwnershipUnlessViewAllIsGranted() {
        MissionRepository missions = mock(MissionRepository.class);
        UserRepository users = mock(UserRepository.class);
        PermissionService permissions = mock(PermissionService.class);
        AppUser customer = new AppUser("customer", "customer2@test.vn", "hash", null, UserStatus.ACTIVE);
        customer.setId(8L);
        when(users.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(false);
        when(missions.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        MissionService service = new IMissionService(missions, mock(UavServiceRepository.class), users,
                permissions, mock(AuditLogService.class), mock(MissionEventRepository.class));
        service.list(MissionFilter.empty(), PageRequest.of(0, 20),
                UsernamePasswordAuthenticationToken.authenticated("customer", "n/a", List.of()));

        verify(missions).findAll(any(Specification.class), any(Pageable.class));
    }

    private MissionCreateRequest request() {
        return new MissionCreateRequest(MissionType.AREA_INSPECTION, "Inspect area", "North sector",
                LocalDate.of(2026, 10, 8), LocalDateTime.of(2026, 10, 8, 10, 0),
                LocalDateTime.of(2026, 10, 8, 12, 0), "Hanoi", null, null, null, null, null);
    }
}
