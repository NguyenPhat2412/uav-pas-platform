package com.uav.platform.service.airspace;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.airspace.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.request.mission.FlightPlanRequest;
import com.uav.platform.dto.request.mission.MissionCreateRequest;
import com.uav.platform.dto.request.mission.MissionPermitUpsertRequest;
import com.uav.platform.dto.request.mission.MissionPermitVerifyRequest;
import com.uav.platform.dto.request.mission.MissionUpdateRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceZoneResponse;
import com.uav.platform.entity.airspace.AirspaceZone;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.airspace.AirspaceGeometryType;
import com.uav.platform.enums.airspace.AirspaceZoneType;
import com.uav.platform.enums.media.MediaType;
import com.uav.platform.enums.mission.FlightPermitStatus;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.airspace.AirspaceMapper;
import com.uav.platform.mapper.mission.MissionMapper;
import com.uav.platform.repository.airspace.AirspaceZoneRepository;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionMediaRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.billing.QuotaService;
import com.uav.platform.service.impl.airspace.AirspaceServiceImpl;
import com.uav.platform.service.impl.mission.FlightPlanOperations;
import com.uav.platform.service.impl.mission.MissionLifecycleServiceImpl;
import com.uav.platform.service.impl.mission.MissionPermitOperations;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.mission.MissionBillingService;
import com.uav.platform.service.mission.MissionEventService;
import com.uav.platform.service.mission.MissionResourceService;
import com.uav.platform.service.notification.NotificationService;
import com.uav.platform.service.permission.PermissionService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

class AirspaceAndPermitWorkflowTest {

    private AirspaceZone noiBaiCtr;
    private AirspaceZone giaLamRestrictedPolygon;
    private AirspaceZone hoaLacWarning;
    private AirspaceZoneRepository zoneRepository;
    private PermissionService permissionService;
    private AuditLogService auditLogService;
    private AirspaceServiceImpl airspaceService;

    private final Authentication adminAuth =
            new UsernamePasswordAuthenticationToken("admin", "n/a", List.of());
    private final Authentication customerAuth =
            new UsernamePasswordAuthenticationToken("customer1", "n/a", List.of());
    private final Authentication operatorAuth =
            new UsernamePasswordAuthenticationToken("pilot1", "n/a", List.of());

    @BeforeEach
    void setUp() {
        noiBaiCtr = new AirspaceZone();
        noiBaiCtr.setId(1L);
        noiBaiCtr.setCode("VVNB-CTR");
        noiBaiCtr.setName("Vùng kiểm soát sân bay quốc tế Nội Bài");
        noiBaiCtr.setZoneType(AirspaceZoneType.PROHIBITED);
        noiBaiCtr.setGeometryType(AirspaceGeometryType.CIRCLE);
        noiBaiCtr.setCenterLat(new BigDecimal("21.2212000"));
        noiBaiCtr.setCenterLng(new BigDecimal("105.8072000"));
        noiBaiCtr.setRadiusMeters(8000);
        noiBaiCtr.setMaxAltitudeAglM(0);
        noiBaiCtr.setAuthority("Cục Hàng không Việt Nam (CAAV)");
        noiBaiCtr.setActive(true);

        giaLamRestrictedPolygon = new AirspaceZone();
        giaLamRestrictedPolygon.setId(2L);
        giaLamRestrictedPolygon.setCode("VVGL-POLY-R1");
        giaLamRestrictedPolygon.setName("Hành lang quản lý bay Gia Lâm");
        giaLamRestrictedPolygon.setZoneType(AirspaceZoneType.RESTRICTED);
        giaLamRestrictedPolygon.setGeometryType(AirspaceGeometryType.POLYGON);
        giaLamRestrictedPolygon.setCenterLat(new BigDecimal("21.0450000"));
        giaLamRestrictedPolygon.setCenterLng(new BigDecimal("105.8850000"));
        giaLamRestrictedPolygon.setPolygonVertices(
                "[[21.0350,105.8750],[21.0350,105.8950],[21.0550,105.8950],[21.0550,105.8750]]");
        giaLamRestrictedPolygon.setMaxAltitudeAglM(60);
        giaLamRestrictedPolygon.setAuthority("Cục Tác nghiệp Quản lý bay dân dụng");
        giaLamRestrictedPolygon.setActive(true);

        hoaLacWarning = new AirspaceZone();
        hoaLacWarning.setId(3L);
        hoaLacWarning.setCode("VN-HN-HOALAC-W1");
        hoaLacWarning.setName("Hành lang bay Khu Công nghệ cao Hòa Lạc");
        hoaLacWarning.setZoneType(AirspaceZoneType.WARNING);
        hoaLacWarning.setGeometryType(AirspaceGeometryType.CIRCLE);
        hoaLacWarning.setCenterLat(new BigDecimal("21.0124000"));
        hoaLacWarning.setCenterLng(new BigDecimal("105.5253000"));
        hoaLacWarning.setRadiusMeters(3500);
        hoaLacWarning.setMaxAltitudeAglM(120);
        hoaLacWarning.setAuthority("Ban Quản lý Khu Công nghệ cao Hòa Lạc");
        hoaLacWarning.setActive(true);

        zoneRepository = mock(AirspaceZoneRepository.class);
        permissionService = mock(PermissionService.class);
        auditLogService = mock(AuditLogService.class);

        when(zoneRepository.findByActiveTrueOrderByZoneTypeAscNameAsc())
                .thenReturn(List.of(noiBaiCtr, giaLamRestrictedPolygon, hoaLacWarning));

        airspaceService =
                new AirspaceServiceImpl(
                        zoneRepository,
                        Mappers.getMapper(AirspaceMapper.class),
                        permissionService,
                        auditLogService);
    }

    @Test
    void spatialGeometryDetectsProhibitedCircleAndSegmentCrossings() {
        // Point directly inside Noi Bai CTR
        AirspaceCheckResponse pointHit =
                airspaceService.check(
                        new AirspaceCheckRequest("POINT", null, null, 21.2250, 105.8100, 80));
        assertTrue(pointHit.blocked());
        assertFalse(pointHit.clear());
        assertEquals("BLOCKED", pointHit.clearance());
        assertEquals(1, pointHit.violations().size());
        assertEquals("VVNB-CTR", pointHit.violations().get(0).code());

        // Polygon whose vertices lie outside Noi Bai CTR (west and east) while an edge cuts across
        // the circle
        AirspaceCheckResponse edgeCrossHit =
                airspaceService.check(
                        new AirspaceCheckRequest(
                                "POLYGON",
                                List.of(
                                        List.of(21.2212, 105.7000),
                                        List.of(21.2212, 105.9200),
                                        List.of(21.3100, 105.9200)),
                                null,
                                21.3100,
                                105.7000,
                                90));
        assertTrue(edgeCrossHit.blocked());
        assertEquals("BLOCKED", edgeCrossHit.clearance());

        // Distant coastal survey completely clear of all zones
        AirspaceCheckResponse clearCheck =
                airspaceService.check(
                        new AirspaceCheckRequest("POINT", null, null, 20.9500, 107.0800, 100));
        assertTrue(clearCheck.clear());
        assertFalse(clearCheck.blocked());
        assertFalse(clearCheck.requiresPermit());
        assertEquals("CLEAR", clearCheck.clearance());
        assertTrue(clearCheck.violations().isEmpty());
    }

    @Test
    void polygonRestrictedZoneAndWarningCeilingRulesClassifyCorrectly() {
        // Polygon flight plan crossing restricted polygon edges
        AirspaceCheckResponse restrictedHit =
                airspaceService.check(
                        new AirspaceCheckRequest(
                                "POLYGON",
                                List.of(
                                        List.of(21.0450, 105.8700),
                                        List.of(21.0450, 105.9000),
                                        List.of(21.0600, 105.8850)),
                                null,
                                21.0450,
                                105.8700,
                                50));
        assertFalse(restrictedHit.blocked());
        assertTrue(restrictedHit.requiresPermit());
        assertEquals("PERMIT_REQUIRED", restrictedHit.clearance());
        assertEquals("VVGL-POLY-R1", restrictedHit.violations().get(0).code());

        // Hoa Lac WARNING zone at <= 120m AGL is advisory CAUTION (does NOT require permit)
        AirspaceCheckResponse warningBelowCeiling =
                airspaceService.check(
                        new AirspaceCheckRequest(
                                "CIRCLE",
                                List.of(List.of(21.0124, 105.5253)),
                                300,
                                21.0124,
                                105.5253,
                                120));
        assertFalse(warningBelowCeiling.blocked());
        assertFalse(warningBelowCeiling.requiresPermit());
        assertFalse(warningBelowCeiling.clear());
        assertEquals("CAUTION", warningBelowCeiling.clearance());
        assertEquals(1, warningBelowCeiling.violations().size());
        assertFalse(warningBelowCeiling.violations().get(0).requiresPermit());

        // Hoa Lac WARNING zone above 120m AGL escalates to PERMIT_REQUIRED
        AirspaceCheckResponse warningAboveCeiling =
                airspaceService.check(
                        new AirspaceCheckRequest(
                                "CIRCLE",
                                List.of(List.of(21.0124, 105.5253)),
                                300,
                                21.0124,
                                105.5253,
                                150));
        assertFalse(warningAboveCeiling.blocked());
        assertTrue(warningAboveCeiling.requiresPermit());
        assertEquals("PERMIT_REQUIRED", warningAboveCeiling.clearance());
        assertTrue(warningAboveCeiling.violations().get(0).requiresPermit());
    }

    @Test
    void zoneManagementEnforcesAdminAccessAndUniqueCode() {
        when(permissionService.has(customerAuth, "USER_MANAGE")).thenReturn(false);
        assertThrows(
                AccessDeniedException.class, () -> airspaceService.listZones(false, customerAuth));

        when(permissionService.has(adminAuth, "USER_MANAGE")).thenReturn(true);
        when(zoneRepository.findAllByOrderByZoneTypeAscNameAsc())
                .thenReturn(List.of(noiBaiCtr, giaLamRestrictedPolygon, hoaLacWarning));
        assertEquals(3, airspaceService.listZones(false, adminAuth).size());

        when(zoneRepository.existsByCodeIgnoreCase("VVNB-CTR")).thenReturn(true);
        AirspaceZoneUpsertRequest duplicateReq =
                new AirspaceZoneUpsertRequest(
                        "vvnb-ctr",
                        "Duplicate CTR",
                        AirspaceZoneType.PROHIBITED,
                        AirspaceGeometryType.CIRCLE,
                        21.2212,
                        105.8072,
                        5000,
                        null,
                        0,
                        "CAAV",
                        true,
                        null);
        SystemException dupEx =
                assertThrows(
                        SystemException.class,
                        () -> airspaceService.createZone(duplicateReq, adminAuth));
        assertEquals("AIRSPACE_ZONE_CODE_EXISTS", dupEx.getCode());

        when(zoneRepository.existsByCodeIgnoreCase("VN-HP-CATBI-CTR")).thenReturn(false);
        when(zoneRepository.save(any(AirspaceZone.class)))
                .thenAnswer(
                        inv -> {
                            AirspaceZone z = inv.getArgument(0);
                            z.setId(99L);
                            return z;
                        });
        AirspaceZoneResponse created =
                airspaceService.createZone(
                        new AirspaceZoneUpsertRequest(
                                "vn-hp-catbi-ctr",
                                "Vùng kiểm soát sân bay Cát Bi",
                                AirspaceZoneType.PROHIBITED,
                                AirspaceGeometryType.CIRCLE,
                                20.8194,
                                106.7250,
                                7000,
                                null,
                                0,
                                "CAAV",
                                true,
                                "Vùng cấm bay quanh sân bay Cát Bi"),
                        adminAuth);
        assertEquals("VN-HP-CATBI-CTR", created.code());
        assertEquals(AirspaceZoneType.PROHIBITED, created.zoneType());
    }

    @Test
    @SuppressWarnings("unchecked")
    void fullMissionFlightPermitLifecycleEnforcesAirspaceAndPreflightGates() {
        MissionRepository missionRepo = mock(MissionRepository.class);
        ServiceOfferingRepository serviceRepo = mock(ServiceOfferingRepository.class);
        AuditLogService audit = mock(AuditLogService.class);
        MissionEventRepository eventRepo = mock(MissionEventRepository.class);
        QuotaService quota = mock(QuotaService.class);
        MissionMediaRepository missionMedia = mock(MissionMediaRepository.class);
        MissionAccessService access = mock(MissionAccessService.class);
        MissionEventService missionEvents = mock(MissionEventService.class);
        MissionResourceService resources = mock(MissionResourceService.class);
        MissionBillingService billing = mock(MissionBillingService.class);
        MissionMapper missionMapper = Mappers.getMapper(MissionMapper.class);
        NotificationService notificationService = mock(NotificationService.class);

        ObjectProvider<AirspaceService> airspaceProvider = mock(ObjectProvider.class);
        when(airspaceProvider.getIfAvailable()).thenReturn(airspaceService);

        ObjectProvider<NotificationService> notificationProvider = mock(ObjectProvider.class);
        when(notificationProvider.getIfAvailable()).thenReturn(notificationService);

        MissionLifecycleServiceImpl lifecycle =
                new MissionLifecycleServiceImpl(
                        missionRepo,
                        serviceRepo,
                        audit,
                        eventRepo,
                        quota,
                        missionMedia,
                        access,
                        missionEvents,
                        resources,
                        billing,
                        missionMapper);
        lifecycle.setAirspace(airspaceProvider);
        lifecycle.setNotifications(notificationProvider);

        AppUser customer = new AppUser();
        customer.setId(10L);
        customer.setUsername("customer1");
        customer.setEmail("customer1@uav.all1.vn");
        when(access.user("customer1")).thenReturn(customer);
        when(missionRepo.nextCodeValue()).thenReturn(42L);

        List<Mission> savedMissions = new ArrayList<>();
        when(missionRepo.save(any(Mission.class)))
                .thenAnswer(
                        inv -> {
                            Mission m = inv.getArgument(0);
                            if (m.getId() == null) {
                                m.setId(101L);
                            }
                            savedMissions.add(m);
                            return m;
                        });

        LocalDateTime start = LocalDateTime.now().plusHours(4);
        LocalDateTime end = start.plusHours(2);

        // 1. Prohibited zone blocks validate() and create() with AIRSPACE_PROHIBITED_ZONE
        FlightPlanRequest prohibitedPlan =
                new FlightPlanRequest(
                        "CIRCLE",
                        List.of(List.of(21.2212, 105.8072)),
                        300,
                        21.2212,
                        105.8072,
                        80,
                        3.0,
                        75,
                        65,
                        List.of("RGB_4K"),
                        null,
                        false);
        MissionCreateRequest prohibitedCreate =
                new MissionCreateRequest(
                        MissionType.DATA_COLLECTION,
                        "Khảo sát gần Nội Bài",
                        null,
                        start.toLocalDate(),
                        start,
                        end,
                        "Sóc Sơn, Hà Nội",
                        new BigDecimal("21.2212"),
                        new BigDecimal("105.8072"),
                        null,
                        MissionPriority.NORMAL,
                        null,
                        prohibitedPlan);

        SystemException prohibitedEx =
                assertThrows(SystemException.class, () -> lifecycle.validate(prohibitedCreate));
        assertEquals(HttpStatus.BAD_REQUEST, prohibitedEx.getStatus());
        assertEquals("AIRSPACE_PROHIBITED_ZONE", prohibitedEx.getCode());
        assertEquals("flightPlan.vertices", prohibitedEx.getField());

        // 2. Creating a mission inside a RESTRICTED zone sets permitStatus = PENDING
        FlightPlanRequest restrictedPlan =
                new FlightPlanRequest(
                        "CIRCLE",
                        List.of(List.of(21.0450, 105.8850)),
                        250,
                        21.0450,
                        105.8850,
                        50,
                        3.0,
                        75,
                        65,
                        List.of("RGB_4K"),
                        null,
                        false);
        MissionCreateRequest restrictedCreate =
                new MissionCreateRequest(
                        MissionType.AREA_INSPECTION,
                        "Kiểm tra hạ tầng Long Biên",
                        "Bay kiểm tra hành lang cầu",
                        start.toLocalDate(),
                        start,
                        end,
                        "Long Biên, Hà Nội",
                        new BigDecimal("21.0450"),
                        new BigDecimal("105.8850"),
                        null,
                        MissionPriority.HIGH,
                        null,
                        restrictedPlan);

        var createdResp = lifecycle.create(restrictedCreate, "customer1");
        Mission mission = savedMissions.get(0);
        assertEquals(FlightPermitStatus.PENDING, mission.getPermitStatus());
        assertNotNull(createdResp.permit());
        assertEquals(FlightPermitStatus.PENDING, createdResp.permit().status());

        when(access.accessibleForUpdate(eq(101L), any())).thenReturn(mission);

        // 2b. Moving draft to a clear zone resets PENDING back to NOT_REQUIRED, then moving back
        // restores PENDING
        FlightPlanRequest clearPlan =
                new FlightPlanRequest(
                        "CIRCLE",
                        List.of(List.of(20.9500, 107.0800)),
                        250,
                        20.9500,
                        107.0800,
                        80,
                        3.0,
                        75,
                        65,
                        List.of("RGB_4K"),
                        null,
                        false);
        lifecycle.updateDraft(
                101L,
                new MissionUpdateRequest(
                        0L,
                        mission.getTitle(),
                        mission.getDescription(),
                        mission.getRequestedDate(),
                        mission.getStartTime(),
                        mission.getExpectedEndTime(),
                        "Hạ Long, Quảng Ninh",
                        new BigDecimal("20.9500"),
                        new BigDecimal("107.0800"),
                        MissionPriority.HIGH,
                        null,
                        clearPlan),
                customerAuth);
        assertEquals(FlightPermitStatus.NOT_REQUIRED, mission.getPermitStatus());

        lifecycle.updateDraft(
                101L,
                new MissionUpdateRequest(
                        0L,
                        mission.getTitle(),
                        mission.getDescription(),
                        mission.getRequestedDate(),
                        mission.getStartTime(),
                        mission.getExpectedEndTime(),
                        "Long Biên, Hà Nội",
                        new BigDecimal("21.0450"),
                        new BigDecimal("105.8850"),
                        MissionPriority.HIGH,
                        null,
                        restrictedPlan),
                customerAuth);
        assertEquals(FlightPermitStatus.PENDING, mission.getPermitStatus());

        // 3. Upsert permit -> SUBMITTED
        LocalDateTime now = LocalDateTime.now();
        mission.setStartTime(now.plusMinutes(30));
        mission.setExpectedEndTime(now.plusHours(2));
        mission.setRequestedDate(LocalDate.now());

        lifecycle.upsertPermit(
                101L,
                new MissionPermitUpsertRequest(
                        "GPB-2026-0089",
                        "Cục Tác nghiệp Quản lý bay",
                        now.minusHours(1),
                        now.plusHours(6),
                        60,
                        null,
                        "Hồ sơ phép bay số 0089"),
                customerAuth);
        assertEquals(FlightPermitStatus.SUBMITTED, mission.getPermitStatus());
        assertEquals("GPB-2026-0089", mission.getPermitNumber());

        // Prepare mission in READY state for preflight start checks
        mission.setStatus(MissionStatus.READY);
        mission.setOperatorAccepted(true);
        Uav uav = new Uav();
        uav.setId(5L);
        mission.setUav(uav);

        // 4. Start blocked before verification -> 409 MISSION_PERMIT_REQUIRED
        SystemException unverifiedEx =
                assertThrows(SystemException.class, () -> lifecycle.start(101L, operatorAuth));
        assertEquals(HttpStatus.CONFLICT, unverifiedEx.getStatus());
        assertEquals("MISSION_PERMIT_REQUIRED", unverifiedEx.getCode());

        // 5. Rejecting permit -> REJECTED + notifies customer + still blocks start
        lifecycle.verifyPermit(
                101L,
                new MissionPermitVerifyRequest(false, "Thiếu dấu xác nhận phụ lục tọa độ"),
                adminAuth);
        assertEquals(FlightPermitStatus.REJECTED, mission.getPermitStatus());
        verify(notificationService, times(1)).sendNotification(any());

        SystemException rejectedStartEx =
                assertThrows(SystemException.class, () -> lifecycle.start(101L, operatorAuth));
        assertEquals("MISSION_PERMIT_REQUIRED", rejectedStartEx.getCode());

        // 6. Re-submit permit & verify(true) -> VERIFIED
        lifecycle.upsertPermit(
                101L,
                new MissionPermitUpsertRequest(
                        "GPB-2026-0089-R1",
                        "Cục Tác nghiệp Quản lý bay",
                        now.minusHours(1),
                        now.plusHours(6),
                        40, // lower than flightPlan's 55m AGL to test altitude gate first!
                        null,
                        "Đã bổ sung bản sao công chứng"),
                customerAuth);
        assertNull(mission.getPermitVerifiedBy());
        assertEquals(FlightPermitStatus.SUBMITTED, mission.getPermitStatus());

        lifecycle.verifyPermit(
                101L, new MissionPermitVerifyRequest(true, "Hợp lệ đủ điều kiện bay"), adminAuth);
        assertEquals(FlightPermitStatus.VERIFIED, mission.getPermitStatus());
        assertEquals("admin", mission.getPermitVerifiedBy());
        assertNotNull(mission.getPermitVerifiedAt());

        // 7. Start blocked when flightPlan altitude (55m) exceeds permitMaxAltitudeM (40m)
        SystemException altitudeEx =
                assertThrows(SystemException.class, () -> lifecycle.start(101L, operatorAuth));
        assertEquals(HttpStatus.CONFLICT, altitudeEx.getStatus());
        assertEquals("MISSION_PERMIT_ALTITUDE_EXCEEDED", altitudeEx.getCode());

        // 8. Start blocked when permit window has expired / does not cover expectedEndTime
        mission.setPermitMaxAltitudeM(60);
        mission.setPermitValidUntil(now.plusMinutes(45)); // before expectedEndTime (now + 2h)
        SystemException expiredEx =
                assertThrows(SystemException.class, () -> lifecycle.start(101L, operatorAuth));
        assertEquals(HttpStatus.CONFLICT, expiredEx.getStatus());
        assertEquals("MISSION_PERMIT_EXPIRED", expiredEx.getCode());

        // 9. Valid window + valid altitude -> start succeeds!
        mission.setPermitValidUntil(now.plusHours(6));
        assertEquals(50, FlightPlanOperations.read(mission.getFlightPlan()).altitudeAglMeters());
        var startedResp = lifecycle.start(101L, operatorAuth);
        assertEquals(MissionStatus.IN_PROGRESS, mission.getStatus());
        assertEquals(MissionStatus.IN_PROGRESS, startedResp.status());
        assertEquals(FlightPermitStatus.VERIFIED, startedResp.permit().status());
        assertTrue(
                Optional.ofNullable(startedResp.permit().permitNumber())
                        .orElse("")
                        .contains("GPB-2026-0089-R1"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void draftEditInvalidatesVerifiedPermitAndInProgressBlocksPermitMutation() {
        MissionRepository missionRepo = mock(MissionRepository.class);
        MissionAccessService access = mock(MissionAccessService.class);
        ObjectProvider<AirspaceService> airspaceProvider = mock(ObjectProvider.class);
        when(airspaceProvider.getIfAvailable()).thenReturn(airspaceService);

        MissionLifecycleServiceImpl lifecycle =
                new MissionLifecycleServiceImpl(
                        missionRepo,
                        mock(ServiceOfferingRepository.class),
                        mock(AuditLogService.class),
                        mock(MissionEventRepository.class),
                        mock(QuotaService.class),
                        mock(MissionMediaRepository.class),
                        access,
                        mock(MissionEventService.class),
                        mock(MissionResourceService.class),
                        mock(MissionBillingService.class),
                        Mappers.getMapper(MissionMapper.class));
        lifecycle.setAirspace(airspaceProvider);

        AppUser customer = new AppUser();
        customer.setId(10L);
        customer.setUsername("customer1");
        when(access.user("customer1")).thenReturn(customer);

        LocalDateTime start = LocalDateTime.now().plusHours(4);
        LocalDateTime end = start.plusHours(2);

        Mission draft = new Mission();
        draft.setId(202L);
        draft.setCode("MSN-2026-000202");
        draft.setCustomer(customer);
        draft.setMissionType(MissionType.AREA_INSPECTION);
        draft.setTitle("Kiểm tra cầu Long Biên");
        draft.setRequestedDate(start.toLocalDate());
        draft.setStartTime(start);
        draft.setExpectedEndTime(end);
        draft.setLocationName("Long Biên");
        draft.setLatitude(new BigDecimal("21.0450"));
        draft.setLongitude(new BigDecimal("105.8850"));
        draft.setPriority(MissionPriority.NORMAL);
        draft.setStatus(MissionStatus.DRAFT);
        draft.setPermitStatus(FlightPermitStatus.VERIFIED);
        draft.setPermitNumber("GPB-2026-0202");
        draft.setPermitAuthority("CAAV");
        draft.setPermitValidFrom(start.minusHours(1));
        draft.setPermitValidUntil(end.plusHours(2));
        draft.setPermitMaxAltitudeM(60);
        draft.setPermitVerifiedBy("admin");
        draft.setPermitVerifiedAt(LocalDateTime.now().minusMinutes(10));

        when(access.accessibleForUpdate(eq(202L), any())).thenReturn(draft);

        FlightPlanRequest editedPlan =
                new FlightPlanRequest(
                        "CIRCLE",
                        List.of(List.of(21.0450, 105.8850)),
                        350,
                        21.0450,
                        105.8850,
                        80,
                        3.0,
                        75,
                        65,
                        List.of("RGB_4K"),
                        null,
                        false);

        // 1. Editing a DRAFT mission after VERIFIED resets permitStatus to SUBMITTED and clears
        // verifiedBy/verifiedAt
        lifecycle.updateDraft(
                202L,
                new MissionUpdateRequest(
                        0L,
                        "Kiểm tra cầu Long Biên mở rộng",
                        null,
                        start.toLocalDate(),
                        start,
                        end,
                        "Long Biên",
                        new BigDecimal("21.0450"),
                        new BigDecimal("105.8850"),
                        MissionPriority.NORMAL,
                        null,
                        editedPlan),
                customerAuth);
        assertEquals(FlightPermitStatus.SUBMITTED, draft.getPermitStatus());
        assertNull(draft.getPermitVerifiedBy());
        assertNull(draft.getPermitVerifiedAt());

        // 2. upsertPermit and verifyPermit on an IN_PROGRESS mission are rejected with 409
        // MISSION_INVALID_STATUS
        draft.setStatus(MissionStatus.IN_PROGRESS);
        SystemException upsertInProgressEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                lifecycle.upsertPermit(
                                        202L,
                                        new MissionPermitUpsertRequest(
                                                "GPB-2026-0202-R2",
                                                "CAAV",
                                                start.minusHours(1),
                                                end.plusHours(2),
                                                90,
                                                null,
                                                null),
                                        customerAuth));
        assertEquals(HttpStatus.CONFLICT, upsertInProgressEx.getStatus());
        assertEquals("MISSION_INVALID_STATUS", upsertInProgressEx.getCode());

        SystemException verifyInProgressEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                lifecycle.verifyPermit(
                                        202L,
                                        new MissionPermitVerifyRequest(true, "Try verify airborne"),
                                        adminAuth));
        assertEquals(HttpStatus.CONFLICT, verifyInProgressEx.getStatus());
        assertEquals("MISSION_INVALID_STATUS", verifyInProgressEx.getCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void permitMediaPreventsCrossUserIdorAndPreflightChecksRealTakeoffWallClock() {
        MissionAccessService access = mock(MissionAccessService.class);
        MediaAssetRepository mediaRepo = mock(MediaAssetRepository.class);
        ObjectProvider<MediaAssetRepository> mediaProvider = mock(ObjectProvider.class);
        when(mediaProvider.getIfAvailable()).thenReturn(mediaRepo);

        MissionLifecycleServiceImpl lifecycle =
                new MissionLifecycleServiceImpl(
                        mock(MissionRepository.class),
                        mock(ServiceOfferingRepository.class),
                        mock(AuditLogService.class),
                        mock(MissionEventRepository.class),
                        mock(QuotaService.class),
                        mock(MissionMediaRepository.class),
                        access,
                        mock(MissionEventService.class),
                        mock(MissionResourceService.class),
                        mock(MissionBillingService.class),
                        Mappers.getMapper(MissionMapper.class));
        lifecycle.setMediaAssets(mediaProvider);

        Mission mission = new Mission();
        mission.setId(303L);
        mission.setCode("MSN-2026-000303");
        mission.setStatus(MissionStatus.CONFIRMED);
        when(access.accessibleForUpdate(eq(303L), any())).thenReturn(mission);

        // 3a. Another user's unlinked MediaAsset is rejected with 403 AccessDeniedException
        MediaAsset otherUsersAsset =
                new MediaAsset(
                        "private-permit.pdf",
                        "permits/other-user.pdf",
                        "application/pdf",
                        1024L,
                        MediaType.DOCUMENT,
                        null,
                        null,
                        "customer2",
                        "minio");
        otherUsersAsset.setId(88L);
        otherUsersAsset.setConfirmed(true);
        when(mediaRepo.findById(88L)).thenReturn(Optional.of(otherUsersAsset));

        LocalDateTime now = LocalDateTime.now();
        assertThrows(
                AccessDeniedException.class,
                () ->
                        lifecycle.upsertPermit(
                                303L,
                                new MissionPermitUpsertRequest(
                                        "GPB-2026-0303",
                                        "CAAV",
                                        now.minusHours(1),
                                        now.plusHours(4),
                                        80,
                                        88L,
                                        null),
                                customerAuth));

        // 3b. Caller's own unlinked MediaAsset is accepted and bound to MISSION #303
        MediaAsset ownAsset =
                new MediaAsset(
                        "my-permit.pdf",
                        "permits/customer1.pdf",
                        "application/pdf",
                        2048L,
                        MediaType.DOCUMENT,
                        null,
                        null,
                        "customer1",
                        "minio");
        ownAsset.setId(89L);
        ownAsset.setConfirmed(true);
        when(mediaRepo.findById(89L)).thenReturn(Optional.of(ownAsset));

        lifecycle.upsertPermit(
                303L,
                new MissionPermitUpsertRequest(
                        "GPB-2026-0303",
                        "CAAV",
                        now.minusHours(1),
                        now.plusHours(4),
                        80,
                        89L,
                        null),
                customerAuth);
        assertEquals("MISSION", ownAsset.getLinkedEntityType());
        assertEquals("303", ownAsset.getLinkedEntityId());
        verify(mediaRepo).save(ownAsset);

        // 4. enforcePreflightPermit rejects takeoff when real wall-clock `now` is before validFrom
        // or after validUntil
        Mission readyMission = new Mission();
        readyMission.setId(404L);
        readyMission.setStatus(MissionStatus.READY);
        readyMission.setPermitStatus(FlightPermitStatus.VERIFIED);
        readyMission.setStartTime(now.plusMinutes(30));
        readyMission.setExpectedEndTime(now.plusHours(2));
        readyMission.setPermitValidFrom(now.plusMinutes(15));
        readyMission.setPermitValidUntil(now.plusHours(3));

        SystemException earlyTakeoffEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                MissionPermitOperations.enforcePreflightPermit(
                                        readyMission, false, now));
        assertEquals(HttpStatus.CONFLICT, earlyTakeoffEx.getStatus());
        assertEquals("MISSION_PERMIT_EXPIRED", earlyTakeoffEx.getCode());

        readyMission.setStartTime(now.minusHours(2));
        readyMission.setExpectedEndTime(now.minusMinutes(30));
        readyMission.setPermitValidFrom(now.minusHours(3));
        readyMission.setPermitValidUntil(now.minusMinutes(1));

        SystemException lateTakeoffEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                MissionPermitOperations.enforcePreflightPermit(
                                        readyMission, false, now));
        assertEquals(HttpStatus.CONFLICT, lateTakeoffEx.getStatus());
        assertEquals("MISSION_PERMIT_EXPIRED", lateTakeoffEx.getCode());

        // Also blocks when airspace dynamically requires a permit even if mission had NOT_REQUIRED
        readyMission.setPermitStatus(FlightPermitStatus.NOT_REQUIRED);
        SystemException dynamicRestrictedEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                MissionPermitOperations.enforcePreflightPermit(
                                        readyMission, true, now));
        assertEquals(HttpStatus.CONFLICT, dynamicRestrictedEx.getStatus());
        assertEquals("MISSION_PERMIT_REQUIRED", dynamicRestrictedEx.getCode());
    }
}
