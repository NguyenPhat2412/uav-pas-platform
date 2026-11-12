package com.uav.platform.service.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.controller.mission.FlightSiteController;
import com.uav.platform.controller.mission.MissionController;
import com.uav.platform.controller.reporting.AdminSlaIntelligenceController;
import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.airspace.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.request.mission.FlightPlanRequest;
import com.uav.platform.dto.request.mission.MissionPreflightUpsertRequest;
import com.uav.platform.dto.request.mission.MissionResourceRedispatchRequest;
import com.uav.platform.dto.request.mission.MissionReviewUpsertRequest;
import com.uav.platform.dto.request.mission.MissionUavReplacementRequest;
import com.uav.platform.dto.request.mission.MissionUavUnassignmentRequest;
import com.uav.platform.dto.request.mission.ResourceAssignmentRequest;
import com.uav.platform.dto.request.mission.SavedFlightSiteUpsertRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.mission.MissionDispatchCandidatesResponse;
import com.uav.platform.dto.response.mission.MissionPreflightResponse;
import com.uav.platform.dto.response.mission.MissionResponse;
import com.uav.platform.dto.response.mission.MissionReviewResponse;
import com.uav.platform.dto.response.mission.OperatorLogbookResponse;
import com.uav.platform.dto.response.mission.SavedFlightSiteResponse;
import com.uav.platform.dto.response.reporting.SlaIntelligenceResponse;
import com.uav.platform.entity.airspace.AirspaceZone;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.entity.mission.MissionPreflightLog;
import com.uav.platform.entity.mission.MissionReview;
import com.uav.platform.entity.mission.SavedFlightSite;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavTelemetry;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.airspace.AirspaceGeometryType;
import com.uav.platform.enums.airspace.AirspaceZoneType;
import com.uav.platform.enums.inventory.EquipmentStatus;
import com.uav.platform.enums.inventory.EquipmentType;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.GlobalExceptionHandler;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.mission.MissionMapper;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.maintenance.RepairOrderRepository;
import com.uav.platform.repository.mission.MissionEquipmentReservationRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionMediaRepository;
import com.uav.platform.repository.mission.MissionPreflightLogRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.MissionReviewRepository;
import com.uav.platform.repository.mission.SavedFlightSiteRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.uav.UavTelemetryRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.airspace.AirspaceService;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.billing.QuotaService;
import com.uav.platform.service.impl.airspace.AirspaceGeometryOperations;
import com.uav.platform.service.impl.mission.MissionDispatchServiceImpl;
import com.uav.platform.service.impl.mission.MissionExtendedWorkflowServiceImpl;
import com.uav.platform.service.impl.mission.MissionLifecycleServiceImpl;
import com.uav.platform.service.impl.mission.SavedFlightSiteServiceImpl;
import com.uav.platform.service.impl.reporting.SlaIntelligenceServiceImpl;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.notification.NotificationService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.reporting.SlaIntelligenceService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class NewCapabilitiesWorkflowTest {

    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void v43MigrationRemainsPureSchemaDdlWithoutFabricatedProductionRecords() throws Exception {
        java.nio.file.Path v43 =
                java.nio.file.Path.of(
                        "src/main/resources/db/migration/V43__saved_sites_reviews_preflight_notam_and_sla.sql");
        if (!java.nio.file.Files.isRegularFile(v43)) {
            v43 = java.nio.file.Path.of("backend").resolve(v43);
        }
        String sql = java.nio.file.Files.readString(v43);
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS saved_flight_sites"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS mission_reviews"));
        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS mission_preflight_logs"));
        assertFalse(
                sql.toUpperCase(java.util.Locale.ROOT).contains("INSERT INTO"),
                "Production Flyway DDL migration V43 must not fabricate reviews, preflight signatures, or expiring NOTAM rows");
    }

    @Test
    void jacksonDeserializesAirspaceCheckAndZoneUpsertWithOptionalNotamFields() {
        AirspaceCheckRequest checkWithoutWindow =
                json.readValue(
                        """
                        {
                          "areaType": "POINT",
                          "takeoffLatitude": 21.0285,
                          "takeoffLongitude": 105.8542,
                          "altitudeAglMeters": 80
                        }
                        """,
                        AirspaceCheckRequest.class);
        assertEquals("POINT", checkWithoutWindow.areaType());
        assertNull(checkWithoutWindow.plannedStartTime());

        AirspaceCheckRequest checkWithWindow =
                json.readValue(
                        """
                        {
                          "areaType": "POINT",
                          "takeoffLatitude": 21.0285,
                          "takeoffLongitude": 105.8542,
                          "altitudeAglMeters": 80,
                          "plannedStartTime": "2026-11-10T09:00:00",
                          "plannedEndTime": "2026-11-10T11:00:00"
                        }
                        """,
                        AirspaceCheckRequest.class);
        assertEquals(LocalDateTime.of(2026, 11, 10, 9, 0), checkWithWindow.plannedStartTime());
        assertEquals(LocalDateTime.of(2026, 11, 10, 11, 0), checkWithWindow.plannedEndTime());

        AirspaceZoneUpsertRequest zoneReq =
                json.readValue(
                        """
                        {
                          "code": "VN-NOTAM-99",
                          "name": "Khu vuc NOTAM tam thoi",
                          "zoneType": "RESTRICTED",
                          "geometryType": "CIRCLE",
                          "centerLat": 21.05,
                          "centerLng": 105.80,
                          "radiusMeters": 600,
                          "maxAltitudeAglM": 120,
                          "authority": "Cuc Hang khong Viet Nam",
                          "active": true,
                          "effectiveFrom": "2026-11-10T08:00:00",
                          "effectiveUntil": "2026-11-12T18:00:00"
                        }
                        """,
                        AirspaceZoneUpsertRequest.class);
        assertEquals("VN-NOTAM-99", zoneReq.code());
        assertEquals(LocalDateTime.of(2026, 11, 10, 8, 0), zoneReq.effectiveFrom());
        assertEquals(LocalDateTime.of(2026, 11, 12, 18, 0), zoneReq.effectiveUntil());
    }

    @Test
    void temporaryNotamEvaluatesOnlyAgainstOverlappingFlightWindows() {
        AirspaceZone notam = new AirspaceZone();
        AirspaceGeometryOperations.applyUpsert(
                notam,
                new AirspaceZoneUpsertRequest(
                        "VN-NOTAM-01",
                        "NOTAM su kien dan dung",
                        AirspaceZoneType.PROHIBITED,
                        AirspaceGeometryType.CIRCLE,
                        21.0500,
                        105.8000,
                        800,
                        null,
                        0,
                        "Cuc Hang khong Viet Nam",
                        true,
                        "Tam thoi",
                        LocalDateTime.of(2026, 11, 15, 8, 0),
                        LocalDateTime.of(2026, 11, 15, 18, 0)));

        AirspaceCheckResponse hit =
                AirspaceGeometryOperations.evaluate(
                        new AirspaceCheckRequest(
                                "POINT",
                                null,
                                null,
                                21.0505,
                                105.8005,
                                80,
                                LocalDateTime.of(2026, 11, 15, 10, 0),
                                LocalDateTime.of(2026, 11, 15, 11, 30)),
                        List.of(notam));
        assertTrue(hit.blocked());
        assertEquals("BLOCKED", hit.clearance());

        AirspaceCheckResponse clearNextDay =
                AirspaceGeometryOperations.evaluate(
                        new AirspaceCheckRequest(
                                "POINT",
                                null,
                                null,
                                21.0505,
                                105.8005,
                                80,
                                LocalDateTime.of(2026, 11, 16, 10, 0),
                                LocalDateTime.of(2026, 11, 16, 11, 30)),
                        List.of(notam));
        assertFalse(clearNextDay.blocked());
        assertEquals("CLEAR", clearNextDay.clearance());

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                AirspaceGeometryOperations.applyUpsert(
                                        new AirspaceZone(),
                                        new AirspaceZoneUpsertRequest(
                                                "VN-NOTAM-BAD",
                                                "Bad Window",
                                                AirspaceZoneType.WARNING,
                                                AirspaceGeometryType.CIRCLE,
                                                21.05,
                                                105.80,
                                                500,
                                                null,
                                                120,
                                                "CAAV",
                                                true,
                                                null,
                                                LocalDateTime.of(2026, 11, 15, 18, 0),
                                                LocalDateTime.of(2026, 11, 15, 8, 0))));
        assertEquals("AIRSPACE_EFFECTIVE_WINDOW_INVALID", ex.getCode());

        SystemException badPlannedWindow =
                assertThrows(
                        SystemException.class,
                        () ->
                                AirspaceGeometryOperations.evaluate(
                                        new AirspaceCheckRequest(
                                                "POINT",
                                                null,
                                                null,
                                                21.05,
                                                105.80,
                                                80,
                                                LocalDateTime.of(2026, 11, 15, 14, 0),
                                                LocalDateTime.of(2026, 11, 15, 10, 0)),
                                        List.of()));
        assertEquals("AIRSPACE_PLANNED_WINDOW_INVALID", badPlannedWindow.getCode());
    }

    @Test
    void savedFlightSitesSupportCreateListLimitAndOwnershipDelete() throws Exception {
        SavedFlightSiteRepository repo = mock(SavedFlightSiteRepository.class);
        UserRepository userRepo = mock(UserRepository.class);
        MissionAccessService access = mock(MissionAccessService.class);
        AuditLogService audit = mock(AuditLogService.class);

        AppUser customer = user(10L, "pilot1", "Nguyen Van A", UserRole.ROLE_PILOT);
        Authentication auth = auth("pilot1", "MISSION_VIEW", "MISSION_CREATE");
        when(access.user("pilot1")).thenReturn(customer);
        when(userRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(customer));
        when(repo.countByUserId(10L)).thenReturn(2L);
        when(repo.save(any(SavedFlightSite.class)))
                .thenAnswer(
                        inv -> {
                            SavedFlightSite s = inv.getArgument(0);
                            ReflectionTestUtils.setField(s, "id", 77L);
                            return s;
                        });

        SavedFlightSiteServiceImpl service =
                new SavedFlightSiteServiceImpl(repo, userRepo, access, audit);

        FlightPlanRequest circlePlan =
                new FlightPlanRequest(
                        "CIRCLE",
                        List.of(List.of(21.0125, 105.5253)),
                        350,
                        21.0125,
                        105.5253,
                        80,
                        3.0,
                        75,
                        65,
                        List.of("RGB_4K", "LIDAR"),
                        null,
                        false);

        SavedFlightSiteResponse created =
                service.createSite(
                        new SavedFlightSiteUpsertRequest(
                                "Khu CNC Hoa Lac",
                                "Thach That, Ha Noi",
                                null,
                                null,
                                MissionType.DATA_COLLECTION,
                                circlePlan,
                                "Bay buoi sang"),
                        auth);
        assertEquals(77L, created.id());
        assertEquals("Khu CNC Hoa Lac", created.name());
        assertNotNull(created.flightPlan());
        assertEquals("CIRCLE", created.flightPlan().areaType());

        when(repo.countByUserId(10L)).thenReturn(30L);
        SystemException capEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.createSite(
                                        new SavedFlightSiteUpsertRequest(
                                                "Site 31",
                                                "Ha Noi",
                                                BigDecimal.valueOf(21.0),
                                                BigDecimal.valueOf(105.8),
                                                MissionType.AREA_INSPECTION,
                                                null,
                                                null),
                                        auth));
        assertEquals("SAVED_SITE_LIMIT_REACHED", capEx.getCode());

        var mvc =
                MockMvcBuilders.standaloneSetup(new FlightSiteController(service))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        when(repo.findByUserIdOrderByUpdatedAtDescIdDesc(10L)).thenReturn(List.of());
        mvc.perform(get("/api/v1/flight-sites").principal(auth))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void extendedMissionWorkflowCoversCloneReviewPreflightLogbookAndSmartDispatch() {
        MissionRepository missions = mock(MissionRepository.class);
        MissionEventRepository events = mock(MissionEventRepository.class);
        MissionReviewRepository reviews = mock(MissionReviewRepository.class);
        MissionPreflightLogRepository preflightLogs = mock(MissionPreflightLogRepository.class);
        MissionEquipmentReservationRepository reservations =
                mock(MissionEquipmentReservationRepository.class);
        StationRepository stations = mock(StationRepository.class);
        UavRepository uavs = mock(UavRepository.class);
        UavTelemetryRepository telemetry = mock(UavTelemetryRepository.class);
        EquipmentRepository equipmentRepo = mock(EquipmentRepository.class);
        UserRepository users = mock(UserRepository.class);
        MissionAccessService access = mock(MissionAccessService.class);
        MissionLifecycleService lifecycle = mock(MissionLifecycleService.class);
        MissionDispatchService dispatch = mock(MissionDispatchService.class);
        MissionResourceService resources = mock(MissionResourceService.class);
        MissionBillingService billing = mock(MissionBillingService.class);
        QuotaService quota = mock(QuotaService.class);
        AuditLogService audit = mock(AuditLogService.class);
        MissionMapper mapper = mock(MissionMapper.class);
        PermissionService permissions = mock(PermissionService.class);
        ObjectProvider<AirspaceService> airspaceProvider = mock(ObjectProvider.class);
        ObjectProvider<NotificationService> notificationProvider = mock(ObjectProvider.class);
        RepairOrderRepository repairs = mock(RepairOrderRepository.class);

        MissionExtendedWorkflowServiceImpl service =
                new MissionExtendedWorkflowServiceImpl(
                        missions,
                        events,
                        reviews,
                        preflightLogs,
                        reservations,
                        stations,
                        uavs,
                        telemetry,
                        equipmentRepo,
                        users,
                        access,
                        lifecycle,
                        dispatch,
                        resources,
                        billing,
                        quota,
                        audit,
                        mapper,
                        permissions,
                        airspaceProvider,
                        notificationProvider,
                        repairs);

        AppUser customer = user(11L, "customer1", "Khach Hang A", UserRole.ROLE_PILOT);
        AppUser operator = user(22L, "operator1", "Phi Cong B", UserRole.ROLE_OPERATOR);
        Authentication customerAuth = auth("customer1", "MISSION_VIEW", "MISSION_CREATE");
        Authentication operatorAuth =
                auth(
                        "operator1",
                        "MISSION_VIEW",
                        "MISSION_CONFIRM",
                        "MISSION_ASSIGN_STATION",
                        "MISSION_ASSIGN_UAV",
                        "MISSION_ASSIGN_OPERATOR",
                        "MISSION_RESERVE_EQUIPMENT");
        when(permissions.has(eq(operatorAuth), anyString())).thenReturn(true);

        Mission source = new Mission();
        ReflectionTestUtils.setField(source, "id", 101L);
        source.setCode("MSN-2026-0101");
        source.setTitle("Khảo sát cầu Nhật Tân");
        source.setMissionType(MissionType.AREA_INSPECTION);
        source.setPriority(MissionPriority.HIGH);
        source.setStatus(MissionStatus.COMPLETED);
        source.setCustomer(customer);
        source.setOperator(operator);
        source.setLocationName("Tây Hồ, Hà Nội");
        source.setLatitude(BigDecimal.valueOf(21.0892));
        source.setLongitude(BigDecimal.valueOf(105.8211));
        source.setStartTime(LocalDateTime.now().minusDays(2).withHour(9).withMinute(0));
        source.setExpectedEndTime(LocalDateTime.now().minusDays(2).withHour(10).withMinute(30));

        when(access.accessible(101L, customerAuth)).thenReturn(source);
        when(access.accessibleForUpdate(101L, customerAuth)).thenReturn(source);
        when(access.user("customer1")).thenReturn(customer);
        when(access.user("operator1")).thenReturn(operator);
        when(lifecycle.nextCode(anyInt())).thenReturn("MSN-2026-0202");
        when(billing.calculateDurationHours(any(), any())).thenReturn(1.5);
        when(missions.save(any(Mission.class)))
                .thenAnswer(
                        inv -> {
                            Mission m = inv.getArgument(0);
                            ReflectionTestUtils.setField(m, "id", 202L);
                            return m;
                        });
        MissionResponse clonedDto = mock(MissionResponse.class);
        when(mapper.toResponse(any(Mission.class))).thenReturn(clonedDto);

        // 1. Clone mission
        MissionResponse cloned = service.cloneMission(101L, customerAuth);
        assertSame(clonedDto, cloned);
        verify(events).save(argThat(ev -> ev.getEventType() == MissionEventType.CLONED));

        // 2. Handover review on COMPLETED mission
        when(reviews.findByMissionId(101L)).thenReturn(Optional.empty());
        when(reviews.save(any(MissionReview.class)))
                .thenAnswer(
                        inv -> {
                            MissionReview r = inv.getArgument(0);
                            ReflectionTestUtils.setField(r, "id", 55L);
                            return r;
                        });
        MissionReviewResponse reviewResp =
                service.upsertReview(
                        101L,
                        new MissionReviewUpsertRequest(5, 5, 4, true, "Dữ liệu 3D rất sắc nét"),
                        customerAuth);
        assertTrue(reviewResp.reviewed());
        assertEquals(5, reviewResp.overallRating());
        assertTrue(reviewResp.deliverablesAccepted());

        // 3. Pre-flight checklist on CONFIRMED mission
        Mission readyMission = new Mission();
        ReflectionTestUtils.setField(readyMission, "id", 303L);
        readyMission.setCode("MSN-2026-0303");
        readyMission.setStatus(MissionStatus.CONFIRMED);
        readyMission.setOperator(operator);
        readyMission.setLatitude(BigDecimal.valueOf(21.0285));
        readyMission.setLongitude(BigDecimal.valueOf(105.8542));
        readyMission.setStartTime(LocalDateTime.now().plusHours(4));
        readyMission.setExpectedEndTime(LocalDateTime.now().plusHours(6));

        when(access.accessible(303L, operatorAuth)).thenReturn(readyMission);
        when(access.accessibleForUpdate(303L, operatorAuth)).thenReturn(readyMission);
        when(access.hasAuthority(eq(operatorAuth), anyString())).thenReturn(true);
        when(preflightLogs.findByMissionId(303L)).thenReturn(Optional.empty());
        when(preflightLogs.save(any(MissionPreflightLog.class)))
                .thenAnswer(
                        inv -> {
                            MissionPreflightLog p = inv.getArgument(0);
                            ReflectionTestUtils.setField(p, "id", 88L);
                            return p;
                        });

        MissionPreflightResponse preflight =
                service.upsertPreflight(
                        303L,
                        new MissionPreflightUpsertRequest(
                                true, true, true, true, true, 94, 18, 3.8, "RTK FIX ổn định"),
                        operatorAuth);
        assertTrue(preflight.recorded());
        assertTrue(preflight.clearedForTakeoff());
        assertEquals(94, preflight.measuredBatteryPct());

        // 4. Operator logbook
        when(missions.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(source));
        when(preflightLogs.findByMissionIdIn(anyCollection())).thenReturn(List.of());
        when(reviews.findByMissionIdIn(anyCollection())).thenReturn(List.of());
        OperatorLogbookResponse logbook = service.operatorLogbook(null, operatorAuth);
        assertEquals(1L, logbook.completedMissions());
        assertEquals(1.5, logbook.totalFlightHours());

        // 5. Smart dispatch candidates & auto-assign (all 4 slots unassigned)
        // Non-dispatcher must be rejected BEFORE acquiring row lock!
        assertThrows(AccessDeniedException.class, () -> service.autoAssign(303L, customerAuth));
        verify(access, never()).accessibleForUpdate(303L, customerAuth);

        readyMission.setOperator(null);
        when(resources.eligibleOperator(operator)).thenReturn(true);

        Station st = new Station();
        ReflectionTestUtils.setField(st, "id", 1L);
        st.setCode("ST-HN-01");
        st.setName("Trạm Hà Nội");
        st.setAddress("Hà Nội");
        st.setLatitude(21.0300);
        st.setLongitude(105.8500);
        st.setStatus(StationStatus.ACTIVE);

        Uav uav = new Uav("Matrice 350 RTK", "UAV-SN-01", "DJI Enterprise");
        ReflectionTestUtils.setField(uav, "id", 5L);
        uav.setStatus(UavStatus.AVAILABLE);
        uav.setStation(st);
        uav.setLastMaintenanceAt(LocalDateTime.now().minusDays(10));

        UavTelemetry tel = new UavTelemetry();
        tel.setUavId(5L);
        tel.setBatteryPct(92);

        Equipment eq = new Equipment("Pin TB65", EquipmentType.BATTERY, "BAT-01", st);
        ReflectionTestUtils.setField(eq, "id", 9L);
        eq.setStatus(EquipmentStatus.ACTIVE);
        eq.setQuantity(4);
        eq.setAvailableQuantity(3);

        when(stations.findAll()).thenReturn(List.of(st));
        when(uavs.findAllWithStation()).thenReturn(List.of(uav));
        when(equipmentRepo.findAllWithStation()).thenReturn(List.of(eq));
        when(users.findByRole(UserRole.ROLE_OPERATOR)).thenReturn(List.of(operator));
        when(missions.findActiveWithResourcesNotIn(anyCollection()))
                .thenReturn(List.of(readyMission));
        when(missions.countCompletedByOperator()).thenReturn(List.of());
        when(reviews.averageOverallRatingByOperator()).thenReturn(List.of());
        when(reservations.existsByMissionIdAndReleasedFalse(303L)).thenReturn(false);
        when(reservations.findByMissionIdAndReleasedFalse(303L)).thenReturn(List.of());
        when(telemetry.latestPerUav()).thenReturn(List.of(tel));

        MissionDispatchCandidatesResponse candidates =
                service.dispatchCandidates(303L, operatorAuth);
        assertTrue(candidates.canAutoAssign());
        assertEquals(1L, candidates.recommendedStationId());
        assertEquals(5L, candidates.recommendedUavId());
        assertEquals(22L, candidates.recommendedOperatorId());
        assertEquals(9L, candidates.recommendedEquipmentId());

        MissionResponse assignedResp = mock(MissionResponse.class);
        when(dispatch.assignStation(
                        eq(303L), any(ResourceAssignmentRequest.class), eq(operatorAuth)))
                .thenReturn(assignedResp);
        when(dispatch.assignUav(eq(303L), any(ResourceAssignmentRequest.class), eq(operatorAuth)))
                .thenReturn(assignedResp);
        when(dispatch.assignOperator(
                        eq(303L), any(ResourceAssignmentRequest.class), eq(operatorAuth)))
                .thenReturn(assignedResp);
        when(dispatch.reserveEquipment(
                        eq(303L), any(ResourceAssignmentRequest.class), eq(operatorAuth)))
                .thenReturn(assignedResp);

        MissionResponse autoAssigned = service.autoAssign(303L, operatorAuth);
        assertSame(assignedResp, autoAssigned);
        verify(dispatch).assignStation(eq(303L), any(), eq(operatorAuth));
        verify(dispatch).assignUav(eq(303L), any(), eq(operatorAuth));
        verify(dispatch).assignOperator(eq(303L), any(), eq(operatorAuth));
        verify(dispatch).reserveEquipment(eq(303L), any(), eq(operatorAuth));
    }

    @Test
    void slaIntelligenceComputesTurnaroundLeaderboardPredictiveMaintenanceAndServesEndpoint()
            throws Exception {
        MissionRepository missions = mock(MissionRepository.class);
        MissionEventRepository events = mock(MissionEventRepository.class);
        MissionReviewRepository reviews = mock(MissionReviewRepository.class);
        MissionPreflightLogRepository preflights = mock(MissionPreflightLogRepository.class);
        UavRepository uavs = mock(UavRepository.class);
        UavTelemetryRepository telemetry = mock(UavTelemetryRepository.class);
        RepairOrderRepository repairs = mock(RepairOrderRepository.class);
        UserRepository users = mock(UserRepository.class);
        PermissionService permissions = mock(PermissionService.class);

        Authentication adminAuth = auth("admin", "DASHBOARD_VIEW", "MISSION_VIEW_ALL");
        when(permissions.has(adminAuth, "MISSION_VIEW_ALL")).thenReturn(true);

        AppUser op = user(22L, "operator1", "Phi Cong B", UserRole.ROLE_OPERATOR);
        AppUser cust = user(11L, "customer1", "Khach Hang A", UserRole.ROLE_PILOT);

        Uav overdueUav = new Uav("Mavic 3 Enterprise", "UAV-OVERDUE-1", "DJI Enterprise");
        ReflectionTestUtils.setField(overdueUav, "id", 7L);
        overdueUav.setStatus(UavStatus.AVAILABLE);
        overdueUav.setLastMaintenanceAt(LocalDateTime.now().minusDays(120));

        Mission m = new Mission();
        ReflectionTestUtils.setField(m, "id", 500L);
        m.setCode("MSN-2026-0500");
        m.setTitle("Khảo sát điện mặt trời");
        m.setStatus(MissionStatus.COMPLETED);
        m.setOperator(op);
        m.setCustomer(cust);
        m.setUav(overdueUav);
        LocalDateTime start = LocalDateTime.now().minusDays(1).withHour(8).withMinute(0);
        m.setStartTime(start);
        m.setExpectedEndTime(start.plusHours(2));
        m.setCompletedAt(start.plusMinutes(110));

        MissionEvent submitted =
                new MissionEvent(
                        m,
                        MissionEventType.SUBMITTED,
                        cust,
                        MissionStatus.DRAFT,
                        MissionStatus.PENDING_CONFIRMATION,
                        "Submitted",
                        null);
        ReflectionTestUtils.setField(submitted, "createdAt", start.minusHours(5));

        MissionEvent confirmed =
                new MissionEvent(
                        m,
                        MissionEventType.STATUS_CHANGED,
                        op,
                        MissionStatus.PENDING_CONFIRMATION,
                        MissionStatus.CONFIRMED,
                        "Confirmed",
                        null);
        ReflectionTestUtils.setField(confirmed, "createdAt", start.minusHours(4).minusMinutes(30));

        MissionPreflightLog pf = new MissionPreflightLog();
        pf.setMission(m);
        pf.setClearedForTakeoff(true);

        MissionReview rev = new MissionReview();
        ReflectionTestUtils.setField(rev, "id", 1L);
        rev.setMission(m);
        rev.setCustomer(cust);
        rev.setOverallRating(5);
        rev.setDeliverablesAccepted(true);

        when(missions.findAllNonDraftWithAssociations()).thenReturn(List.of(m));
        when(events.findConfirmationTimelineEvents()).thenReturn(List.of(submitted, confirmed));
        when(reviews.findAllWithMissionAndCustomer()).thenReturn(List.of(rev));
        when(reviews.findTop20ByOrderByUpdatedAtDescIdDesc()).thenReturn(List.of(rev));
        when(preflights.findAllWithMission()).thenReturn(List.of(pf));
        when(uavs.findAllWithStation()).thenReturn(List.of(overdueUav));
        when(users.findByRole(UserRole.ROLE_OPERATOR)).thenReturn(List.of(op));
        when(telemetry.latestPerUav()).thenReturn(List.of());
        when(repairs.findUavIdsWithStatusIn(anySet())).thenReturn(java.util.Set.of());

        SlaIntelligenceService slaService =
                new SlaIntelligenceServiceImpl(
                        missions,
                        events,
                        reviews,
                        preflights,
                        uavs,
                        telemetry,
                        repairs,
                        users,
                        permissions);

        SlaIntelligenceResponse report = slaService.getIntelligence(adminAuth);
        assertEquals(30.0, report.avgConfirmationMinutes());
        assertEquals(100.0, report.onTimeCompletionRate());
        assertEquals(100.0, report.preflightComplianceRate());
        assertEquals(5.0, report.avgCustomerRating());
        assertEquals(1L, report.overdueUavCount());
        assertEquals("OVERDUE", report.fleetMaintenanceRisks().get(0).riskLevel());
        assertEquals(1, report.operatorLeaderboard().size());

        Authentication plainPilot = auth("customer1", "MISSION_VIEW");
        assertThrows(AccessDeniedException.class, () -> slaService.getIntelligence(plainPilot));

        SlaIntelligenceService nullPermService =
                new SlaIntelligenceServiceImpl(
                        missions,
                        events,
                        reviews,
                        preflights,
                        uavs,
                        telemetry,
                        repairs,
                        users,
                        null);
        assertThrows(AccessDeniedException.class, () -> nullPermService.getIntelligence(adminAuth));

        var mvc =
                MockMvcBuilders.standaloneSetup(new AdminSlaIntelligenceController(slaService))
                        .setControllerAdvice(new GlobalExceptionHandler())
                        .build();
        mvc.perform(
                        get("/api/v1/admin/sla-intelligence")
                                .principal(adminAuth)
                                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avgConfirmationMinutes").value(30.0))
                .andExpect(jsonPath("$.fleetMaintenanceRisks[0].riskLevel").value("OVERDUE"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void
            preflightSafetyGateBlocksUncClearedStartEnforcesThresholdsAndInvalidatesOnHardwareChange() {
        MissionRepository missions = mock(MissionRepository.class);
        MissionEventRepository events = mock(MissionEventRepository.class);
        MissionReviewRepository reviews = mock(MissionReviewRepository.class);
        MissionPreflightLogRepository preflightLogs = mock(MissionPreflightLogRepository.class);
        MissionEquipmentReservationRepository reservations =
                mock(MissionEquipmentReservationRepository.class);
        StationRepository stations = mock(StationRepository.class);
        UavRepository uavs = mock(UavRepository.class);
        UavTelemetryRepository telemetry = mock(UavTelemetryRepository.class);
        EquipmentRepository equipmentRepo = mock(EquipmentRepository.class);
        UserRepository users = mock(UserRepository.class);
        MissionAccessService access = mock(MissionAccessService.class);
        MissionLifecycleService lifecycleMock = mock(MissionLifecycleService.class);
        MissionDispatchService dispatchMock = mock(MissionDispatchService.class);
        MissionResourceService resources = mock(MissionResourceService.class);
        MissionBillingService billing = mock(MissionBillingService.class);
        QuotaService quota = mock(QuotaService.class);
        AuditLogService audit = mock(AuditLogService.class);
        MissionMapper mapper = mock(MissionMapper.class);
        PermissionService permissions = mock(PermissionService.class);
        MissionEventService missionEvents = mock(MissionEventService.class);
        ObjectProvider<AirspaceService> airspaceProvider = mock(ObjectProvider.class);
        ObjectProvider<NotificationService> notificationProvider = mock(ObjectProvider.class);

        MissionExtendedWorkflowServiceImpl extendedService =
                new MissionExtendedWorkflowServiceImpl(
                        missions,
                        events,
                        reviews,
                        preflightLogs,
                        reservations,
                        stations,
                        uavs,
                        telemetry,
                        equipmentRepo,
                        users,
                        access,
                        lifecycleMock,
                        dispatchMock,
                        resources,
                        billing,
                        quota,
                        audit,
                        mapper,
                        permissions,
                        airspaceProvider,
                        notificationProvider);

        AppUser operator = user(22L, "operator1", "Phi Cong B", UserRole.ROLE_OPERATOR);
        Authentication operatorAuth =
                auth(
                        "operator1",
                        "MISSION_VIEW",
                        "MISSION_START",
                        "MISSION_ASSIGN_UAV",
                        "MISSION_ASSIGN_STATION");
        when(access.user("operator1")).thenReturn(operator);
        when(permissions.has(eq(operatorAuth), anyString())).thenReturn(true);

        Station st1 = new Station();
        ReflectionTestUtils.setField(st1, "id", 1L);
        st1.setCode("ST-01");
        st1.setStatus(StationStatus.ACTIVE);

        Station st2 = new Station();
        ReflectionTestUtils.setField(st2, "id", 2L);
        st2.setCode("ST-02");
        st2.setStatus(StationStatus.ACTIVE);

        Uav uav1 = new Uav("M350", "SN-01", "DJI");
        ReflectionTestUtils.setField(uav1, "id", 10L);
        uav1.setStatus(UavStatus.ASSIGNED);
        uav1.setStation(st1);

        Uav uav2 = new Uav("M350", "SN-02", "DJI");
        ReflectionTestUtils.setField(uav2, "id", 11L);
        uav2.setStatus(UavStatus.AVAILABLE);
        uav2.setStation(st1);

        Mission mission = new Mission();
        ReflectionTestUtils.setField(mission, "id", 700L);
        mission.setCode("MSN-2026-0700");
        mission.setStatus(MissionStatus.READY);
        mission.setOperator(operator);
        mission.setOperatorAccepted(true);
        mission.setStation(st1);
        mission.setUav(uav1);
        mission.setLatitude(BigDecimal.valueOf(21.0285));
        mission.setLongitude(BigDecimal.valueOf(105.8542));
        mission.setStartTime(LocalDateTime.now().plusMinutes(15));
        mission.setExpectedEndTime(LocalDateTime.now().plusMinutes(75));

        when(access.accessibleForUpdate(700L, operatorAuth)).thenReturn(mission);
        when(preflightLogs.save(any(MissionPreflightLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // 1. Numeric thresholds: low satellites (< 6) and excessive wind (> 15 m/s) prevent
        // clearance
        when(preflightLogs.findByMissionId(700L)).thenReturn(Optional.empty());
        MissionPreflightResponse lowSat =
                extendedService.upsertPreflight(
                        700L,
                        new MissionPreflightUpsertRequest(
                                true, true, true, true, true, 90, 4, 4.0, "Weak GNSS"),
                        operatorAuth);
        assertFalse(
                lowSat.clearedForTakeoff(),
                "Fewer than 6 GNSS satellites must not clear mission for takeoff");

        MissionPreflightResponse highWind =
                extendedService.upsertPreflight(
                        700L,
                        new MissionPreflightUpsertRequest(
                                true, true, true, true, true, 90, 14, 16.5, "Gale wind"),
                        operatorAuth);
        assertFalse(
                highWind.clearedForTakeoff(),
                "Measured wind above 15 m/s must not clear mission for takeoff");

        // 2. MissionLifecycleServiceImpl.start() must enforce preflight safety gate
        MissionLifecycleServiceImpl lifecycle =
                new MissionLifecycleServiceImpl(
                        missions,
                        mock(ServiceOfferingRepository.class),
                        audit,
                        events,
                        quota,
                        mock(MissionMediaRepository.class),
                        access,
                        missionEvents,
                        resources,
                        billing,
                        mapper);
        ObjectProvider<MissionPreflightLogRepository> preflightProvider =
                mock(ObjectProvider.class);
        when(preflightProvider.getIfAvailable()).thenReturn(preflightLogs);
        ReflectionTestUtils.setField(lifecycle, "preflightLogs", preflightProvider);

        MissionPreflightLog unclearedLog = new MissionPreflightLog();
        unclearedLog.setMission(mission);
        unclearedLog.setClearedForTakeoff(false);
        when(preflightLogs.findByMissionId(700L)).thenReturn(Optional.of(unclearedLog));

        SystemException blockedUncleared =
                assertThrows(SystemException.class, () -> lifecycle.start(700L, operatorAuth));
        assertEquals("MISSION_PREFLIGHT_NOT_CLEARED", blockedUncleared.getCode());
        assertEquals(MissionStatus.READY, mission.getStatus());

        // Strict signoff mode blocks takeoff even when no preflight log exists yet
        when(preflightLogs.findByMissionId(700L)).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(lifecycle, "preflightSignoffRequired", true);
        SystemException blockedMissing =
                assertThrows(SystemException.class, () -> lifecycle.start(700L, operatorAuth));
        assertEquals("MISSION_PREFLIGHT_NOT_CLEARED", blockedMissing.getCode());

        // Cleared preflight allows takeoff
        MissionPreflightLog clearedLog = new MissionPreflightLog();
        clearedLog.setMission(mission);
        clearedLog.setAirframeAndPropellersSafe(true);
        clearedLog.setClearedForTakeoff(true);
        when(preflightLogs.findByMissionId(700L)).thenReturn(Optional.of(clearedLog));
        MissionResponse startedResp = mock(MissionResponse.class);
        when(mapper.toResponse(mission)).thenReturn(startedResp);

        assertSame(startedResp, lifecycle.start(700L, operatorAuth));
        assertEquals(MissionStatus.IN_PROGRESS, mission.getStatus());

        // 3. Hardware swap (UAV replacement / station redispatch) invalidates cleared preflight log
        mission.setStatus(MissionStatus.READY);
        uav1.setStatus(UavStatus.ASSIGNED);
        clearedLog.setAirframeAndPropellersSafe(true);
        clearedLog.setClearedForTakeoff(true);

        MissionDispatchServiceImpl dispatchService =
                new MissionDispatchServiceImpl(
                        null,
                        missions,
                        permissions,
                        audit,
                        events,
                        stations,
                        mock(InventoryService.class),
                        reservations,
                        access,
                        missionEvents,
                        resources,
                        mapper);
        ReflectionTestUtils.setField(dispatchService, "preflightLogs", preflightProvider);
        when(resources.lockUav(10L)).thenReturn(uav1);
        when(resources.lockUav(11L)).thenReturn(uav2);
        when(reservations.existsByMissionIdAndReleasedFalse(700L)).thenReturn(true);

        dispatchService.replaceUav(
                700L,
                new MissionUavReplacementRequest(10L, 11L, "Swap airframe due to gimbal check"),
                operatorAuth);
        assertFalse(
                clearedLog.isClearedForTakeoff(),
                "Replacing UAV must invalidate existing preflight takeoff clearance");
        assertFalse(
                clearedLog.isAirframeAndPropellersSafe(),
                "Replacing UAV must require re-verifying airframe and propellers");

        // Re-sign clearance, then unassign UAV and redispatch station
        clearedLog.setAirframeAndPropellersSafe(true);
        clearedLog.setClearedForTakeoff(true);
        uav2.setStatus(UavStatus.ASSIGNED);
        dispatchService.unassignUav(
                700L,
                new MissionUavUnassignmentRequest(11L, "Remove UAV for bench check"),
                operatorAuth);
        assertFalse(clearedLog.isClearedForTakeoff());

        clearedLog.setClearedForTakeoff(true);
        when(stations.findById(2L)).thenReturn(Optional.of(st2));
        when(resources.activeReservationsLocked(700L)).thenReturn(List.of());
        dispatchService.redispatchStation(
                700L,
                new MissionResourceRedispatchRequest(mission.getVersion(), 2L, "Move launch site"),
                operatorAuth);
        assertFalse(
                clearedLog.isClearedForTakeoff(),
                "Changing station must invalidate existing preflight takeoff clearance");
    }

    @Test
    @SuppressWarnings("unchecked")
    void securityPermissionsNullCustomerReviewJsonCloneAndOpenRepairOrderExclusion()
            throws Exception {
        // 1. Controller @PreAuthorize guards align with service & client permission matrices
        String slaExpr =
                AdminSlaIntelligenceController.class
                        .getMethod("getIntelligence", Authentication.class)
                        .getAnnotation(PreAuthorize.class)
                        .value();
        assertTrue(slaExpr.contains("DASHBOARD_VIEW"));
        assertTrue(slaExpr.contains("MISSION_VIEW_ALL"));
        assertTrue(slaExpr.contains("USER_MANAGE"));

        String reviewExpr =
                MissionController.class
                        .getMethod(
                                "upsertReview",
                                Long.class,
                                MissionReviewUpsertRequest.class,
                                Authentication.class)
                        .getAnnotation(PreAuthorize.class)
                        .value();
        assertFalse(
                reviewExpr.contains("'MISSION_VIEW'"),
                "PUT /review must not allow plain MISSION_VIEW operators/commanders");
        assertTrue(reviewExpr.contains("MISSION_CREATE"));
        assertTrue(reviewExpr.contains("USER_MANAGE"));

        String candidatesExpr =
                MissionController.class
                        .getMethod("dispatchCandidates", Long.class, Authentication.class)
                        .getAnnotation(PreAuthorize.class)
                        .value();
        assertFalse(
                candidatesExpr.contains("'MISSION_VIEW'"),
                "GET /dispatch-candidates must require dispatcher/commander permissions");
        assertTrue(candidatesExpr.contains("MISSION_VIEW_ALL"));
        assertTrue(candidatesExpr.contains("MISSION_ASSIGN_UAV"));

        // 2. upsertReview() on internal mission (customer == null) falls back to admin actor
        MissionRepository missions = mock(MissionRepository.class);
        MissionEventRepository events = mock(MissionEventRepository.class);
        MissionReviewRepository reviews = mock(MissionReviewRepository.class);
        MissionPreflightLogRepository preflightLogs = mock(MissionPreflightLogRepository.class);
        MissionEquipmentReservationRepository reservations =
                mock(MissionEquipmentReservationRepository.class);
        StationRepository stations = mock(StationRepository.class);
        UavRepository uavs = mock(UavRepository.class);
        UavTelemetryRepository telemetry = mock(UavTelemetryRepository.class);
        EquipmentRepository equipmentRepo = mock(EquipmentRepository.class);
        UserRepository users = mock(UserRepository.class);
        MissionAccessService access = mock(MissionAccessService.class);
        MissionLifecycleService lifecycle = mock(MissionLifecycleService.class);
        MissionDispatchService dispatch = mock(MissionDispatchService.class);
        MissionResourceService resources = mock(MissionResourceService.class);
        MissionBillingService billing = mock(MissionBillingService.class);
        QuotaService quota = mock(QuotaService.class);
        AuditLogService audit = mock(AuditLogService.class);
        MissionMapper mapper = mock(MissionMapper.class);
        PermissionService permissions = mock(PermissionService.class);
        ObjectProvider<AirspaceService> airspaceProvider = mock(ObjectProvider.class);
        ObjectProvider<NotificationService> notificationProvider = mock(ObjectProvider.class);
        RepairOrderRepository repairs = mock(RepairOrderRepository.class);

        MissionExtendedWorkflowServiceImpl service =
                new MissionExtendedWorkflowServiceImpl(
                        missions,
                        events,
                        reviews,
                        preflightLogs,
                        reservations,
                        stations,
                        uavs,
                        telemetry,
                        equipmentRepo,
                        users,
                        access,
                        lifecycle,
                        dispatch,
                        resources,
                        billing,
                        quota,
                        audit,
                        mapper,
                        permissions,
                        airspaceProvider,
                        notificationProvider,
                        repairs);

        AppUser admin = user(1L, "admin", "Quan Tri Vien", UserRole.ROLE_ADMIN);
        Authentication adminAuth =
                auth("admin", "USER_MANAGE", "MISSION_CREATE", "MISSION_VIEW_ALL");
        when(access.user("admin")).thenReturn(admin);
        when(access.hasAuthority(adminAuth, "USER_MANAGE")).thenReturn(true);

        Mission internalMission = new Mission();
        ReflectionTestUtils.setField(internalMission, "id", 801L);
        internalMission.setCode("MSN-\"EXT\"\\801");
        internalMission.setTitle("Bay kiem dinh noi bo");
        internalMission.setMissionType(MissionType.AREA_INSPECTION);
        internalMission.setPriority(MissionPriority.NORMAL);
        internalMission.setStatus(MissionStatus.COMPLETED);
        internalMission.setCustomer(null);
        internalMission.setStartTime(LocalDateTime.now().minusHours(3));
        internalMission.setExpectedEndTime(LocalDateTime.now().minusHours(2));

        when(access.accessibleForUpdate(801L, adminAuth)).thenReturn(internalMission);
        when(access.accessible(801L, adminAuth)).thenReturn(internalMission);
        when(reviews.findByMissionId(801L)).thenReturn(Optional.empty());
        when(reviews.save(any(MissionReview.class))).thenAnswer(inv -> inv.getArgument(0));

        MissionReviewResponse internalReview =
                service.upsertReview(
                        801L,
                        new MissionReviewUpsertRequest(5, 5, 5, true, "Nghiệm thu nội bộ"),
                        adminAuth);
        assertEquals(
                1L,
                internalReview.customerId(),
                "Internal mission without customer must bind review to signing admin instead of null");

        // 3. cloneMission() serializes valid escaped JSON metadata even with quotes/backslashes
        when(lifecycle.nextCode(anyInt())).thenReturn("MSN-2026-0802");
        when(billing.calculateDurationHours(any(), any())).thenReturn(1.0);
        when(missions.save(any(Mission.class)))
                .thenAnswer(
                        inv -> {
                            Mission m = inv.getArgument(0);
                            ReflectionTestUtils.setField(m, "id", 802L);
                            return m;
                        });
        var eventCaptor = org.mockito.ArgumentCaptor.forClass(MissionEvent.class);
        service.cloneMission(801L, adminAuth);
        verify(events, atLeastOnce()).save(eventCaptor.capture());
        MissionEvent cloneEvent =
                eventCaptor.getAllValues().stream()
                        .filter(ev -> ev.getEventType() == MissionEventType.CLONED)
                        .findFirst()
                        .orElseThrow();
        var parsedMeta = json.readTree(cloneEvent.getMetadata());
        assertEquals(801L, parsedMeta.get("sourceMissionId").asLong());
        assertEquals("MSN-\"EXT\"\\801", parsedMeta.get("sourceCode").asText());

        // 4. Smart dispatch excludes UAVs that have an OPEN or IN_PROGRESS repair order
        when(permissions.has(eq(adminAuth), anyString())).thenReturn(true);
        Mission dispatchTarget = new Mission();
        ReflectionTestUtils.setField(dispatchTarget, "id", 803L);
        dispatchTarget.setCode("MSN-2026-0803");
        dispatchTarget.setStatus(MissionStatus.CONFIRMED);
        dispatchTarget.setStartTime(LocalDateTime.now().plusHours(4));
        dispatchTarget.setExpectedEndTime(LocalDateTime.now().plusHours(6));
        when(access.accessible(803L, adminAuth)).thenReturn(dispatchTarget);
        when(access.accessibleForUpdate(803L, adminAuth)).thenReturn(dispatchTarget);

        Station st = new Station();
        ReflectionTestUtils.setField(st, "id", 1L);
        st.setCode("ST-HN");
        st.setName("Tram Ha Noi");
        st.setStatus(StationStatus.ACTIVE);

        Uav repairQueuedUav = new Uav("M350", "UAV-REPAIR-01", "DJI");
        ReflectionTestUtils.setField(repairQueuedUav, "id", 99L);
        repairQueuedUav.setStatus(UavStatus.AVAILABLE);
        repairQueuedUav.setStation(st);

        when(stations.findAll()).thenReturn(List.of(st));
        when(uavs.findAllWithStation()).thenReturn(List.of(repairQueuedUav));
        when(equipmentRepo.findAllWithStation()).thenReturn(List.of());
        when(users.findByRole(UserRole.ROLE_OPERATOR)).thenReturn(List.of());
        when(missions.findActiveWithResourcesNotIn(anyCollection()))
                .thenReturn(List.of(dispatchTarget));
        when(missions.countCompletedByOperator()).thenReturn(List.of());
        when(reviews.averageOverallRatingByOperator()).thenReturn(List.of());
        when(reservations.findByMissionIdAndReleasedFalse(803L)).thenReturn(List.of());
        when(reservations.existsByMissionIdAndReleasedFalse(803L)).thenReturn(false);
        when(telemetry.latestPerUav()).thenReturn(List.of());
        when(repairs.findUavIdsWithStatusIn(anySet())).thenReturn(java.util.Set.of(99L));

        MissionDispatchCandidatesResponse cand = service.dispatchCandidates(803L, adminAuth);
        assertNull(cand.recommendedUavId());
        assertEquals(1, cand.uavs().size());
        assertFalse(cand.uavs().get(0).eligible());
        assertEquals("OPEN_REPAIR_ORDER", cand.uavs().get(0).conflictReason());
        assertEquals(0, cand.stations().get(0).availableUavCount());
    }

    @Test
    @SuppressWarnings("unchecked")
    void targetedQueriesAvoidFullTableScansAndUseActualCompletedFlightDuration() {
        MissionRepository missions = mock(MissionRepository.class);
        MissionEventRepository events = mock(MissionEventRepository.class);
        MissionReviewRepository reviews = mock(MissionReviewRepository.class);
        MissionPreflightLogRepository preflights = mock(MissionPreflightLogRepository.class);
        MissionEquipmentReservationRepository reservations =
                mock(MissionEquipmentReservationRepository.class);
        StationRepository stations = mock(StationRepository.class);
        UavRepository uavs = mock(UavRepository.class);
        UavTelemetryRepository telemetry = mock(UavTelemetryRepository.class);
        EquipmentRepository equipmentRepo = mock(EquipmentRepository.class);
        RepairOrderRepository repairs = mock(RepairOrderRepository.class);
        UserRepository users = mock(UserRepository.class);
        MissionAccessService access = mock(MissionAccessService.class);
        MissionResourceService resources = mock(MissionResourceService.class);
        PermissionService permissions = mock(PermissionService.class);

        Authentication adminAuth = auth("admin", "DASHBOARD_VIEW", "MISSION_VIEW_ALL");
        when(permissions.has(eq(adminAuth), anyString())).thenReturn(true);

        AppUser op = user(22L, "operator1", "Phi Cong B", UserRole.ROLE_OPERATOR);
        AppUser cust = user(11L, "customer1", "Khach Hang A", UserRole.ROLE_PILOT);

        Station st = new Station();
        ReflectionTestUtils.setField(st, "id", 1L);
        st.setCode("ST-01");
        st.setName("Tram 1");
        st.setStatus(StationStatus.ACTIVE);

        Uav uav = new Uav("M350", "UAV-01", "DJI");
        ReflectionTestUtils.setField(uav, "id", 5L);
        uav.setStatus(UavStatus.AVAILABLE);
        uav.setStation(st);
        uav.setLastMaintenanceAt(LocalDateTime.now().minusDays(20));

        // 2-hour scheduled window, but completed in 90 minutes (1.5 actual flight hours)
        Mission completed = new Mission();
        ReflectionTestUtils.setField(completed, "id", 901L);
        completed.setCode("MSN-901");
        completed.setStatus(MissionStatus.COMPLETED);
        completed.setOperator(op);
        completed.setCustomer(cust);
        completed.setUav(uav);
        LocalDateTime start = LocalDateTime.now().minusHours(5);
        completed.setStartTime(start);
        completed.setExpectedEndTime(start.plusHours(2));
        completed.setCompletedAt(start.plusMinutes(90));

        when(missions.findAllNonDraftWithAssociations()).thenReturn(List.of(completed));
        when(events.findConfirmationTimelineEvents()).thenReturn(List.of());
        when(reviews.findAllWithMissionAndCustomer()).thenReturn(List.of());
        when(reviews.findTop20ByOrderByUpdatedAtDescIdDesc()).thenReturn(List.of());
        when(preflights.findAllWithMission()).thenReturn(List.of());
        when(uavs.findAllWithStation()).thenReturn(List.of(uav));
        when(users.findByRole(UserRole.ROLE_OPERATOR)).thenReturn(List.of(op));
        when(telemetry.latestPerUav()).thenReturn(List.of());
        when(repairs.findUavIdsWithStatusIn(anySet())).thenReturn(java.util.Set.of());

        SlaIntelligenceService sla =
                new SlaIntelligenceServiceImpl(
                        missions,
                        events,
                        reviews,
                        preflights,
                        uavs,
                        telemetry,
                        repairs,
                        users,
                        permissions);
        SlaIntelligenceResponse report = sla.getIntelligence(adminAuth);
        assertEquals(1.5, report.operatorLeaderboard().get(0).totalFlightHours());
        assertEquals(1.5, report.fleetMaintenanceRisks().get(0).flightHoursSinceMaintenance());

        verify(missions, never()).findAll();
        verify(events, never()).findAll();
        verify(reviews, never()).findAll();
        verify(preflights, never()).findAll();
        verify(uavs, never()).findAll();
        verify(users, never()).findAll();

        // Smart dispatch also uses targeted queries without full-table findAll() scans
        Mission target = new Mission();
        ReflectionTestUtils.setField(target, "id", 902L);
        target.setCode("MSN-902");
        target.setStatus(MissionStatus.CONFIRMED);
        target.setStartTime(LocalDateTime.now().plusHours(3));
        target.setExpectedEndTime(LocalDateTime.now().plusHours(4));

        when(access.accessible(902L, adminAuth)).thenReturn(target);
        when(resources.excludedStatuses())
                .thenReturn(
                        List.of(
                                MissionStatus.COMPLETED,
                                MissionStatus.CANCELLED,
                                MissionStatus.REJECTED,
                                MissionStatus.FAILED));
        when(resources.eligibleOperator(op)).thenReturn(true);
        when(stations.findAll()).thenReturn(List.of(st));
        when(equipmentRepo.findAllWithStation()).thenReturn(List.of());
        when(missions.findActiveWithResourcesNotIn(anyCollection())).thenReturn(List.of(target));
        when(missions.countCompletedByOperator())
                .thenReturn(List.<Object[]>of(new Object[] {22L, 4L}));
        when(reviews.averageOverallRatingByOperator())
                .thenReturn(List.<Object[]>of(new Object[] {22L, 4.8}));
        when(reservations.findByMissionIdAndReleasedFalse(902L)).thenReturn(List.of());

        MissionExtendedWorkflowServiceImpl ext =
                new MissionExtendedWorkflowServiceImpl(
                        missions,
                        events,
                        reviews,
                        preflights,
                        reservations,
                        stations,
                        uavs,
                        telemetry,
                        equipmentRepo,
                        users,
                        access,
                        mock(MissionLifecycleService.class),
                        mock(MissionDispatchService.class),
                        resources,
                        mock(MissionBillingService.class),
                        mock(QuotaService.class),
                        mock(AuditLogService.class),
                        mock(MissionMapper.class),
                        permissions,
                        mock(ObjectProvider.class),
                        mock(ObjectProvider.class),
                        repairs);

        MissionDispatchCandidatesResponse cand = ext.dispatchCandidates(902L, adminAuth);
        assertEquals(22L, cand.recommendedOperatorId());
        assertEquals(4L, cand.operators().get(0).completedMissionCount());
        assertEquals(4.8, cand.operators().get(0).averageRating());

        verify(missions, never()).findAll();
        verify(reviews, never()).findAll();
        verify(uavs, never()).findAll();
        verify(equipmentRepo, never()).findAll();
        verify(users, never()).findAll();
    }

    private static AppUser user(Long id, String username, String fullName, UserRole role) {
        AppUser u = new AppUser();
        ReflectionTestUtils.setField(u, "id", id);
        u.setUsername(username);
        u.setFullName(fullName);
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        return u;
    }

    private static Authentication auth(String username, String... authorities) {
        return new UsernamePasswordAuthenticationToken(
                username,
                "n/a",
                java.util.Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList());
    }
}
