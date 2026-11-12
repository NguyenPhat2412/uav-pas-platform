package com.uav.platform.service.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.mission.MissionFilter;
import com.uav.platform.dto.request.mission.MissionCreateRequest;
import com.uav.platform.dto.response.mission.MissionResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.permission.PermissionService;

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

class MissionServiceTest {
    @Test
    void createsDraftWithStableCodeAndCreatedEvent() {
        MissionRepository missions = mock(MissionRepository.class);
        UserRepository users = mock(UserRepository.class);
        MissionEventRepository events = mock(MissionEventRepository.class);
        AppUser customer =
                new AppUser("customer", "customer@test.vn", "hash", null, UserStatus.ACTIVE);
        customer.setId(7L);
        when(users.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(missions.nextCodeValue()).thenReturn(1L);
        when(missions.save(any(Mission.class)))
                .thenAnswer(
                        invocation -> {
                            Mission saved = invocation.getArgument(0);
                            saved.setId(10L);
                            return saved;
                        });

        MissionService service =
                com.uav.platform.support.MissionServiceFixture.create(
                        missions,
                        mock(ServiceOfferingRepository.class),
                        users,
                        mock(PermissionService.class),
                        mock(AuditLogService.class),
                        events);
        MissionResponse response = service.create(request(), "customer");

        assertEquals("MSN-2099-000001", response.code());
        assertEquals(MissionStatus.DRAFT, response.status());
        verify(events).save(any());
    }

    @Test
    void customerListUsesOwnershipUnlessViewAllIsGranted() {
        MissionRepository missions = mock(MissionRepository.class);
        UserRepository users = mock(UserRepository.class);
        PermissionService permissions = mock(PermissionService.class);
        AppUser customer =
                new AppUser("customer", "customer2@test.vn", "hash", null, UserStatus.ACTIVE);
        customer.setId(8L);
        when(users.findByUsername("customer")).thenReturn(Optional.of(customer));
        when(permissions.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(false);
        when(missions.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        MissionService service =
                com.uav.platform.support.MissionServiceFixture.create(
                        missions,
                        mock(ServiceOfferingRepository.class),
                        users,
                        permissions,
                        mock(AuditLogService.class),
                        mock(MissionEventRepository.class));
        service.list(
                MissionFilter.empty(),
                PageRequest.of(0, 20),
                UsernamePasswordAuthenticationToken.authenticated("customer", "n/a", List.of()));

        verify(missions).findAll(any(Specification.class), any(Pageable.class));
    }

    private MissionCreateRequest request() {
        return new MissionCreateRequest(
                MissionType.AREA_INSPECTION,
                "Inspect area",
                "North sector",
                LocalDate.of(2099, 10, 8),
                LocalDateTime.of(2099, 10, 8, 10, 0),
                LocalDateTime.of(2099, 10, 8, 12, 0),
                "Hanoi",
                null,
                null,
                null,
                null,
                null);
    }
}
