package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IProviderDocumentDao;
import com.uav.platform.dao.IProviderPilotDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IServiceOfferingDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.CreateListingFromTemplateRequest;
import com.uav.platform.dto.request.ProviderOrderAssignRequest;
import com.uav.platform.dto.request.ProviderPilotPatchRequest;
import com.uav.platform.dto.request.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.ProviderUavUpdateRequest;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.dto.response.ProviderDocumentResponse;
import com.uav.platform.dto.response.ProviderPilotResponse;
import com.uav.platform.dto.response.ProviderUavResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.ProviderDocument;
import com.uav.platform.entity.ProviderPilot;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.ServiceOffering;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.EquipmentStatus;
import com.uav.platform.enums.EquipmentType;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.ProviderPilotStatus;
import com.uav.platform.enums.ProviderVerificationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.MarketplaceMapper;
import com.uav.platform.mapper.MissionMapper;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.MissionResourceService;
import com.uav.platform.transport.RealtimeEventBroadcaster;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class MarketplaceProviderFleetServiceImplCoverageTest {

    @Mock private IProviderProfileDao providers;
    @Mock private IProviderDocumentDao documents;
    @Mock private IProviderPilotDao pilots;
    @Mock private IMarketplaceListingDao listings;
    @Mock private IServiceOfferingDao serviceOfferings;
    @Mock private IUavDao uavs;
    @Mock private IEquipmentDao equipmentRepository;
    @Mock private IMissionDao missions;
    @Mock private IMissionEventDao missionEvents;
    @Mock private IUserDao users;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditLogService audit;
    @Mock private MissionResourceService resources;
    @Mock private MarketplaceMapper mapper;
    @Mock private MissionMapper missionMapper;
    @Mock private RealtimeEventBroadcaster realtime;

    private MarketplaceProviderFleetServiceImpl service;

    @BeforeEach
    void setUp() {
        service =
                new MarketplaceProviderFleetServiceImpl(
                        providers,
                        documents,
                        pilots,
                        listings,
                        serviceOfferings,
                        uavs,
                        equipmentRepository,
                        missions,
                        missionEvents,
                        users,
                        passwordEncoder,
                        audit,
                        resources,
                        mapper,
                        missionMapper);
        ReflectionTestUtils.setField(service, "realtime", realtime);
    }

    private ProviderProfile verifiedProvider(Long id, String username) {
        AppUser u = new AppUser();
        u.setId(id * 10);
        u.setUsername(username);
        u.setFullName("Owner " + username);
        ProviderProfile p = new ProviderProfile();
        p.setId(id);
        p.setUser(u);
        p.setProvince("Ha Noi");
        p.setServiceRadiusKm(80);
        p.setVerificationStatus(ProviderVerificationStatus.VERIFIED);
        return p;
    }

    @Test
    void listDocumentsUavsPilotsReturnEmptyWhenNoProfileAndListWhenPresent() {
        when(providers.findByUserUsername("nobody")).thenReturn(Optional.empty());
        when(users.findByUsername("nobody")).thenReturn(Optional.empty());
        assertTrue(service.listMyDocuments("nobody").isEmpty());
        assertTrue(service.listMyUavs("nobody").isEmpty());
        assertTrue(service.listMyPilots("nobody").isEmpty());

        ProviderProfile prof = verifiedProvider(1L, "owner");
        when(providers.findByUserUsername("owner")).thenReturn(Optional.of(prof));
        ProviderDocument doc = new ProviderDocument();
        ProviderDocumentResponse docResp = mock(ProviderDocumentResponse.class);
        when(documents.findByProviderIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(doc));
        when(mapper.toDocumentResponse(doc)).thenReturn(docResp);
        assertEquals(1, service.listMyDocuments("owner").size());
    }

    @Test
    void createListingFromTemplateCoversSuspendedMissingAllTemplateCodesAndUrlValidation() {
        ProviderProfile suspended = verifiedProvider(1L, "susp");
        suspended.setVerificationStatus(ProviderVerificationStatus.SUSPENDED);
        when(providers.findByUserUsername("susp")).thenReturn(Optional.of(suspended));
        assertThrows(
                SystemException.class,
                () ->
                        service.createListingFromTemplate(
                                new CreateListingFromTemplateRequest(
                                        1L, null, null, null, null, null, null, null, null, null,
                                        null, null, null),
                                "susp"));

        ProviderProfile prof = verifiedProvider(2L, "owner");
        when(providers.findByUserUsername("owner")).thenReturn(Optional.of(prof));

        when(serviceOfferings.findById(999L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.createListingFromTemplate(
                                new CreateListingFromTemplateRequest(
                                        999L, null, null, null, null, null, null, null, null, null,
                                        null, null, null),
                                "owner"));

        // Invalid coverImageUrl throws INVALID_EXTERNAL_URL
        ServiceOffering dataTpl = new ServiceOffering("DATA_COLLECTION", "LiDAR", "", 60);
        dataTpl.setId(10L);
        dataTpl.setSensors("LiDAR");
        when(serviceOfferings.findById(10L)).thenReturn(Optional.of(dataTpl));
        assertThrows(
                SystemException.class,
                () ->
                        service.createListingFromTemplate(
                                new CreateListingFromTemplateRequest(
                                        10L,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        "ftp://bad.host/img.png",
                                        null),
                                "owner"));

        // Valid DATA_COLLECTION with default fallbacks & valid https coverImageUrl
        when(listings.existsBySlug(any())).thenReturn(false);
        when(listings.save(any(MarketplaceListing.class)))
                .thenAnswer(
                        inv -> {
                            MarketplaceListing l = inv.getArgument(0);
                            l.setId(50L);
                            return l;
                        });
        MarketplaceListingResponse lr = mock(MarketplaceListingResponse.class);
        when(mapper.toListingResponse(any())).thenReturn(lr);
        assertSame(
                lr,
                service.createListingFromTemplate(
                        new CreateListingFromTemplateRequest(
                                10L,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                "https://cdn.uav.vn/cover.jpg",
                                false),
                        "owner"));

        // UAV_RENTAL, AREA_INSPECTION, AERIAL_RECORDING, null code templates with explicit fields
        for (String code :
                new String[] {
                    "UAV_RENTAL", "AREA_INSPECTION", "AERIAL_RECORDING", "CUSTOM", null
                }) {
            ServiceOffering tpl = new ServiceOffering(code, "Tpl " + code, "Desc", 60);
            tpl.setId(11L);
            tpl.setOnSiteHours(12);
            tpl.setDeliveryHours(24);
            when(serviceOfferings.findById(11L)).thenReturn(Optional.of(tpl));
            service.createListingFromTemplate(
                    new CreateListingFromTemplateRequest(
                            11L,
                            "Custom Title",
                            "Da Nang",
                            120,
                            new BigDecimal("1000000"),
                            null,
                            new BigDecimal("2"),
                            36,
                            6,
                            "M350 RTK",
                            "Orthomosaic",
                            "http://cdn.uav.vn/a.png",
                            true),
                    "owner");
        }
    }

    @Test
    void updateDeleteUavEquipmentAndPilotsCoverAllBranches() {
        ProviderProfile prof = verifiedProvider(1L, "owner");
        when(providers.findByUserUsername("owner")).thenReturn(Optional.of(prof));

        Uav u = new Uav("M30", "SN-1", "DJI");
        u.setId(100L);
        u.setProvider(prof);
        u.setStatus(UavStatus.AVAILABLE);
        when(uavs.findById(100L)).thenReturn(Optional.of(u));

        // Duplicate serial on updateMyUav
        when(uavs.existsBySerialNumber("SN-DUP")).thenReturn(true);
        assertThrows(
                SystemException.class,
                () ->
                        service.updateMyUav(
                                100L,
                                new ProviderUavUpdateRequest(null, "SN-DUP", null, null),
                                "owner"));

        // In-flight mission blocks status change
        when(missions.findFirstByUavIdAndStatusOrderByIdDesc(100L, MissionStatus.IN_PROGRESS))
                .thenReturn(Optional.of(new Mission()));
        assertThrows(
                SystemException.class,
                () ->
                        service.updateMyUav(
                                100L,
                                new ProviderUavUpdateRequest(
                                        null, null, null, UavStatus.MAINTENANCE),
                                "owner"));

        // Valid updateMyUav
        when(uavs.existsBySerialNumber("SN-2")).thenReturn(false);
        when(missions.findFirstByUavIdAndStatusOrderByIdDesc(100L, MissionStatus.IN_PROGRESS))
                .thenReturn(Optional.empty());
        when(uavs.save(u)).thenReturn(u);
        ProviderUavResponse uResp = mock(ProviderUavResponse.class);
        when(mapper.toUavResponse(u)).thenReturn(uResp);
        assertSame(
                uResp,
                service.updateMyUav(
                        100L,
                        new ProviderUavUpdateRequest(
                                "M350", "SN-2", "DJI Pro", UavStatus.MAINTENANCE),
                        "owner"));

        // deleteMyUav blocked when in active order
        when(missions.existsByUavIdAndStatusNotIn(eq(100L), any())).thenReturn(true);
        assertThrows(SystemException.class, () -> service.deleteMyUav(100L, "owner"));

        // deleteMyUav clears pilot assignment
        when(missions.existsByUavIdAndStatusNotIn(eq(100L), any())).thenReturn(false);
        ProviderPilot pilotWithUav = new ProviderPilot();
        pilotWithUav.setId(5L);
        pilotWithUav.setAssignedUav(u);
        when(pilots.findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(pilotWithUav));
        service.deleteMyUav(100L, "owner");
        assertNull(pilotWithUav.getAssignedUav());
        assertEquals(UavStatus.INACTIVE, u.getStatus());

        // deleteMyEquipment owned & not found
        Equipment eq = new Equipment("Bat", EquipmentType.BATTERY, null, null);
        eq.setId(200L);
        eq.setProvider(prof);
        when(equipmentRepository.findById(200L)).thenReturn(Optional.of(eq));
        service.deleteMyEquipment(200L, "owner");
        assertEquals(EquipmentStatus.INACTIVE, eq.getStatus());
        when(equipmentRepository.findById(201L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.deleteMyEquipment(201L, "owner"));

        // createPilot reusing existing user by email & updatePilot all fields
        AppUser existingPilotUser = new AppUser();
        existingPilotUser.setId(77L);
        when(users.findByEmail("pilot@uav.vn")).thenReturn(Optional.of(existingPilotUser));
        when(pilots.save(any(ProviderPilot.class)))
                .thenAnswer(
                        inv -> {
                            ProviderPilot pp = inv.getArgument(0);
                            pp.setId(300L);
                            return pp;
                        });
        ProviderPilotResponse pResp = mock(ProviderPilotResponse.class);
        when(mapper.toPilotResponse(any(), anyLong())).thenReturn(pResp);
        service.createPilot(
                new ProviderPilotUpsertRequest(
                        null, null, "Pilot A", "pilot@uav.vn", "090", "LIC1", "SAR", null, null),
                "owner");

        ProviderPilot pEntity = new ProviderPilot();
        pEntity.setId(300L);
        pEntity.setProvider(prof);
        pEntity.setPilotUser(null); // exercises countCompletedForPilot null guard
        u.setStatus(UavStatus.AVAILABLE);
        u.setProvider(prof);
        when(pilots.findByIdAndProviderIdAndDeletedFalse(300L, 1L))
                .thenReturn(Optional.of(pEntity));
        service.updatePilot(
                300L,
                new ProviderPilotPatchRequest(
                        "Pilot B",
                        "b@uav.vn",
                        "091",
                        "LIC2",
                        "LiDAR",
                        ProviderPilotStatus.IN_FLIGHT,
                        100L),
                "owner");
        assertEquals("Pilot B", pEntity.getFullName());
        assertEquals(ProviderPilotStatus.IN_FLIGHT, pEntity.getPilotStatus());
    }

    @Test
    void getMyOrderAndAssignOrderCoverPilotResolutionAndValidation() {
        ProviderProfile prof = verifiedProvider(1L, "owner");
        AppUser pilotUser = new AppUser();
        pilotUser.setId(88L);
        pilotUser.setUsername("pilot88");
        pilotUser.setFullName("Pilot 88");

        // getMyOrder without profile
        when(providers.findByUserUsername("stranger")).thenReturn(Optional.empty());
        when(users.findByUsername("stranger")).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.getMyOrder(1L, "stranger"));

        // getMyOrder as owner succeeds
        Mission m = new Mission();
        m.setId(500L);
        m.setProvider(prof);
        m.setStatus(MissionStatus.CONFIRMED);
        when(providers.findByUserUsername("owner")).thenReturn(Optional.of(prof));
        when(missions.findById(500L)).thenReturn(Optional.of(m));
        MissionResponse mResp = mock(MissionResponse.class);
        when(missionMapper.toResponse(m)).thenReturn(mResp);
        assertSame(mResp, service.getMyOrder(500L, "owner"));

        // assignOrder unverified profile -> PROVIDER_NOT_VERIFIED
        ProviderProfile unverified = verifiedProvider(2L, "unver");
        unverified.setVerificationStatus(ProviderVerificationStatus.PENDING_REVIEW);
        when(providers.findByUserUsername("unver")).thenReturn(Optional.of(unverified));
        assertThrows(
                SystemException.class,
                () ->
                        service.assignOrder(
                                500L,
                                new ProviderOrderAssignRequest(null, null, 1L, null),
                                "unver"));

        // assignOrder validation guards
        when(missions.findByIdForUpdate(500L)).thenReturn(Optional.of(m));
        assertThrows(
                SystemException.class,
                () ->
                        service.assignOrder(
                                500L,
                                new ProviderOrderAssignRequest(null, null, null, null),
                                "owner"));

        m.setStatus(MissionStatus.IN_PROGRESS);
        assertThrows(
                SystemException.class,
                () ->
                        service.assignOrder(
                                500L,
                                new ProviderOrderAssignRequest(null, null, 10L, null),
                                "owner"));
        m.setStatus(MissionStatus.CONFIRMED);

        // UAV mismatch & maintenance
        Uav foreignUav = new Uav("M30", "F1", "DJI");
        foreignUav.setId(10L);
        foreignUav.setProvider(unverified);
        when(resources.lockUav(10L)).thenReturn(foreignUav);
        assertThrows(
                SystemException.class,
                () ->
                        service.assignOrder(
                                500L,
                                new ProviderOrderAssignRequest(null, null, 10L, null),
                                "owner"));

        Uav maintUav = new Uav("M30", "M1", "DJI");
        maintUav.setId(11L);
        maintUav.setProvider(prof);
        maintUav.setStatus(UavStatus.MAINTENANCE);
        when(resources.lockUav(11L)).thenReturn(maintUav);
        assertThrows(
                SystemException.class,
                () ->
                        service.assignOrder(
                                500L,
                                new ProviderOrderAssignRequest(null, null, 11L, null),
                                "owner"));

        // Valid UAV + test resolveAssignedOperator branches
        Uav okUav = new Uav("M350", "OK1", "DJI");
        okUav.setId(12L);
        okUav.setProvider(prof);
        okUav.setStatus(UavStatus.AVAILABLE);
        when(resources.lockUav(12L)).thenReturn(okUav);
        when(missions.save(m)).thenReturn(m);

        // 1) pilotId not belonging to provider -> forbidden
        when(pilots.findByIdAndProviderIdAndDeletedFalse(999L, 1L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.assignOrder(
                                500L,
                                new ProviderOrderAssignRequest(999L, null, 12L, null),
                                "owner"));

        // 2) pilotUserId matching linked ProviderPilot
        ProviderPilot pp = new ProviderPilot();
        pp.setId(40L);
        pp.setProvider(prof);
        pp.setPilotUser(pilotUser);
        when(pilots.findByPilotUserIdAndDeletedFalse(88L)).thenReturn(List.of(pp));
        when(resources.lockOperator(88L)).thenReturn(pilotUser);
        assertSame(
                mResp,
                service.assignOrder(
                        500L, new ProviderOrderAssignRequest(null, 88L, 12L, "go"), "owner"));

        // 3) pilotUserId matching pilot row id fallback
        m.setStatus(MissionStatus.CONFIRMED);
        when(pilots.findByPilotUserIdAndDeletedFalse(40L)).thenReturn(List.of());
        when(pilots.findByIdAndProviderIdAndDeletedFalse(40L, 1L)).thenReturn(Optional.of(pp));
        assertSame(
                mResp,
                service.assignOrder(
                        500L, new ProviderOrderAssignRequest(null, 40L, 12L, null), "owner"));

        // 4) pilotUserId matching provider owner
        m.setStatus(MissionStatus.CONFIRMED);
        Long ownerId = prof.getUser().getId();
        when(pilots.findByPilotUserIdAndDeletedFalse(ownerId)).thenReturn(List.of());
        when(pilots.findByIdAndProviderIdAndDeletedFalse(ownerId, 1L)).thenReturn(Optional.empty());
        when(resources.lockOperator(ownerId)).thenReturn(prof.getUser());
        assertSame(
                mResp,
                service.assignOrder(
                        500L, new ProviderOrderAssignRequest(null, ownerId, 12L, null), "owner"));

        // 5) pilotUserId mismatch -> forbidden
        m.setStatus(MissionStatus.CONFIRMED);
        when(pilots.findByPilotUserIdAndDeletedFalse(777L)).thenReturn(List.of());
        when(pilots.findByIdAndProviderIdAndDeletedFalse(777L, 1L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.assignOrder(
                                500L,
                                new ProviderOrderAssignRequest(null, 777L, 12L, null),
                                "owner"));

        // 6) null pilotId & null pilotUserId -> defaults to provider owner
        m.setStatus(MissionStatus.CONFIRMED);
        assertSame(
                mResp,
                service.assignOrder(
                        500L, new ProviderOrderAssignRequest(null, null, 12L, null), "owner"));
    }
}
