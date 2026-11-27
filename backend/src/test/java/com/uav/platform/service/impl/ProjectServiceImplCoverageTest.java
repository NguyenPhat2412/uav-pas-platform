package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IProjectDao;
import com.uav.platform.dao.IProjectSubscriptionDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.request.ProjectCreateRequest;
import com.uav.platform.dto.request.ProjectSubscriptionCreateRequest;
import com.uav.platform.dto.request.ProjectSubscriptionUpdateRequest;
import com.uav.platform.dto.request.ProjectUpdateRequest;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.dto.response.ProjectResponse;
import com.uav.platform.dto.response.ProjectSubscriptionResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.Project;
import com.uav.platform.entity.ProjectSubscription;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.MissionType;
import com.uav.platform.enums.ProjectStatus;
import com.uav.platform.enums.ProjectSubscriptionStatus;
import com.uav.platform.enums.SubscriptionScheduleType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.ProjectMapper;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.MissionLifecycleService;
import com.uav.platform.service.PermissionService;
import com.uav.platform.transport.RealtimeEventBroadcaster;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplCoverageTest {

    @Mock private IProjectDao projects;
    @Mock private IProjectSubscriptionDao subscriptions;
    @Mock private IMarketplaceListingDao listings;
    @Mock private IMissionDao missions;
    @Mock private IMissionEventDao missionEvents;
    @Mock private IUserDao users;
    @Mock private PermissionService permissions;
    @Mock private MissionLifecycleService missionLifecycle;
    @Mock private AuditLogService audit;
    @Mock private ProjectMapper mapper;
    @Mock private RealtimeEventBroadcaster realtime;

    private ProjectServiceImpl service;

    @BeforeEach
    void setUp() {
        service =
                new ProjectServiceImpl(
                        projects,
                        subscriptions,
                        listings,
                        missions,
                        missionEvents,
                        users,
                        permissions,
                        missionLifecycle,
                        audit,
                        mapper);
        ReflectionTestUtils.setField(service, "realtime", realtime);
    }

    private Authentication auth(String username) {
        Authentication a = mock(Authentication.class);
        lenient().when(a.isAuthenticated()).thenReturn(true);
        lenient().when(a.getName()).thenReturn(username);
        return a;
    }

    private AppUser user(Long id, String username) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        return u;
    }

    private Project project(Long id, AppUser owner, String name) {
        Project p = new Project();
        p.setId(id);
        p.setCode("PRJ-2026-AAA");
        p.setCustomer(owner);
        p.setName(name);
        p.setProvince("Ha Noi");
        p.setStatus(ProjectStatus.ACTIVE);
        return p;
    }

    @Test
    void authGuardsAndGetUpdateDeleteProjectCoverAllBranches() {
        // Null / unauthenticated auth
        assertThrows(SystemException.class, () -> service.getProject(1L, null));
        Authentication unauth = mock(Authentication.class);
        when(unauth.isAuthenticated()).thenReturn(false);
        assertThrows(SystemException.class, () -> service.getProject(1L, unauth));

        AppUser owner = user(1L, "owner");
        AppUser stranger = user(2L, "stranger");
        Authentication ownerAuth = auth("owner");
        Authentication strangerAuth = auth("stranger");
        Project p = project(10L, owner, "Delta Farm");

        when(users.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(users.findByUsername("stranger")).thenReturn(Optional.of(stranger));

        // Project not found
        when(projects.findByIdAndDeletedFalse(999L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.getProject(999L, ownerAuth));
        assertThrows(
                SystemException.class,
                () ->
                        service.updateProject(
                                999L,
                                new ProjectUpdateRequest(null, null, null, null, null),
                                ownerAuth));

        // Access denied for stranger on get & update
        when(projects.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(p));
        assertThrows(AccessDeniedException.class, () -> service.getProject(10L, strangerAuth));
        assertThrows(
                AccessDeniedException.class,
                () ->
                        service.updateProject(
                                10L,
                                new ProjectUpdateRequest("X", null, null, null, null),
                                strangerAuth));

        // Owner getProject succeeds
        ProjectResponse pr = mock(ProjectResponse.class);
        when(subscriptions.countByProjectIdAndDeletedFalseAndStatus(
                        10L, ProjectSubscriptionStatus.ACTIVE))
                .thenReturn(1L);
        when(missions.countByProjectId(10L)).thenReturn(2L);
        when(mapper.toProjectResponse(p, 1L, 2L)).thenReturn(pr);
        assertSame(pr, service.getProject(10L, ownerAuth));

        // Owner updateProject updates all provided fields
        when(projects.save(p)).thenReturn(p);
        assertSame(
                pr,
                service.updateProject(
                        10L,
                        new ProjectUpdateRequest(
                                "  New Farm  ",
                                "Da Nang",
                                "{\"type\":\"Point\",\"coordinates\":[108.2,16.0]}",
                                "updated note",
                                ProjectStatus.ARCHIVED),
                        ownerAuth));
        assertEquals("New Farm", p.getName());
        assertEquals("Da Nang", p.getProvince());
        assertEquals(ProjectStatus.ARCHIVED, p.getStatus());

        // Blank fields do not overwrite name and trim empty note to null
        service.updateProject(
                10L, new ProjectUpdateRequest("   ", " ", null, "  ", null), ownerAuth);
        assertEquals("New Farm", p.getName());
        assertNull(p.getProvince());
        assertNull(p.getNote());
    }

    @Test
    @SuppressWarnings("unchecked")
    void createProjectCodeFallbackAndListSubscriptions() {
        AppUser owner = user(1L, "owner");
        Authentication ownerAuth = auth("owner");
        when(users.findByUsername("owner")).thenReturn(Optional.of(owner));

        // Force all 10 attempts of generateUniqueProjectCode to collide -> fallback 6-byte hex
        when(projects.existsByCode(any())).thenReturn(true);
        when(projects.save(any(Project.class)))
                .thenAnswer(
                        inv -> {
                            Project saved = inv.getArgument(0);
                            saved.setId(55L);
                            return saved;
                        });
        ProjectResponse pr = mock(ProjectResponse.class);
        when(mapper.toProjectResponse(any(), eq(0L), eq(0L))).thenReturn(pr);
        assertSame(
                pr,
                service.createProject(
                        new ProjectCreateRequest("Farm", "Ha Noi", null, "note"), ownerAuth));

        // listSubscriptions
        Project p = project(55L, owner, "Farm");
        ProjectSubscription sub = new ProjectSubscription();
        sub.setId(77L);
        sub.setProject(p);
        when(projects.findByIdAndDeletedFalse(55L)).thenReturn(Optional.of(p));
        when(subscriptions.findAll(any(HibernateSpecification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(sub)));
        when(missions.findFirstBySubscriptionIdOrderByIdAsc(77L)).thenReturn(Optional.empty());
        when(missions.findFirstBySubscriptionIdOrderByIdDesc(77L)).thenReturn(Optional.empty());
        ProjectSubscriptionResponse subResp = mock(ProjectSubscriptionResponse.class);
        when(mapper.toSubscriptionResponse(sub, null, null)).thenReturn(subResp);

        PageResponse<ProjectSubscriptionResponse> page =
                service.listSubscriptions(
                        55L, ProjectSubscriptionStatus.ACTIVE, PageRequest.of(0, 10), ownerAuth);
        assertEquals(1, page.content().size());
    }

    @Test
    void createSubscriptionValidatesErrorsAndCreatesMonthlyMissionWithExplicitCoords() {
        AppUser owner = user(1L, "owner");
        AppUser providerUser = user(9L, "prov");
        Authentication ownerAuth = auth("owner");
        Project p = project(10L, owner, "A".repeat(160));
        when(users.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(projects.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(p));

        // Listing not found
        when(listings.findWithDetailsById(100L)).thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.createSubscription(
                                10L,
                                new ProjectSubscriptionCreateRequest(
                                        100L, null, null, null, null, null, null, null, null, null,
                                        null),
                                ownerAuth));

        // Listing not published
        MarketplaceListing unpublished = new MarketplaceListing();
        unpublished.setId(101L);
        unpublished.setModerationStatus(ListingModerationStatus.DRAFT);
        when(listings.findWithDetailsById(101L)).thenReturn(Optional.of(unpublished));
        assertThrows(
                SystemException.class,
                () ->
                        service.createSubscription(
                                10L,
                                new ProjectSubscriptionCreateRequest(
                                        101L, null, null, null, null, null, null, null, null, null,
                                        null),
                                ownerAuth));

        // Self-booking forbidden
        ProviderProfile ownProfile = new ProviderProfile();
        ownProfile.setUser(owner);
        MarketplaceListing selfListing = new MarketplaceListing();
        selfListing.setId(102L);
        selfListing.setModerationStatus(ListingModerationStatus.PUBLISHED);
        selfListing.setProvider(ownProfile);
        when(listings.findWithDetailsById(102L)).thenReturn(Optional.of(selfListing));
        assertThrows(
                SystemException.class,
                () ->
                        service.createSubscription(
                                10L,
                                new ProjectSubscriptionCreateRequest(
                                        102L, null, null, null, null, null, null, null, null, null,
                                        null),
                                ownerAuth));

        // Valid listing with minBookingUnits = 5
        ProviderProfile otherProfile = new ProviderProfile();
        otherProfile.setUser(providerUser);
        MarketplaceListing listing = new MarketplaceListing();
        listing.setId(103L);
        listing.setTitle("Spraying Service " + "B".repeat(40));
        listing.setModerationStatus(ListingModerationStatus.PUBLISHED);
        listing.setProvider(otherProfile);
        listing.setMinBookingUnits(new BigDecimal("5.00"));
        listing.setMissionType(MissionType.AREA_INSPECTION);
        when(listings.findWithDetailsById(103L)).thenReturn(Optional.of(listing));

        // Below min units
        assertThrows(
                SystemException.class,
                () ->
                        service.createSubscription(
                                10L,
                                new ProjectSubscriptionCreateRequest(
                                        103L,
                                        null,
                                        SubscriptionScheduleType.MONTHLY,
                                        LocalDate.now(),
                                        null,
                                        null,
                                        new BigDecimal("2"),
                                        null,
                                        null,
                                        null,
                                        null),
                                ownerAuth));

        // Past startDate
        assertThrows(
                SystemException.class,
                () ->
                        service.createSubscription(
                                10L,
                                new ProjectSubscriptionCreateRequest(
                                        103L,
                                        null,
                                        SubscriptionScheduleType.MONTHLY,
                                        LocalDate.now().minusDays(1),
                                        null,
                                        null,
                                        new BigDecimal("10"),
                                        null,
                                        null,
                                        null,
                                        null),
                                ownerAuth));

        // Success with MONTHLY, explicit coords, explicit locationName, explicit endTime, today
        // startDate
        when(subscriptions.save(any(ProjectSubscription.class)))
                .thenAnswer(
                        inv -> {
                            ProjectSubscription s = inv.getArgument(0);
                            s.setId(300L);
                            return s;
                        });
        MissionResponse createdDto = mock(MissionResponse.class);
        when(createdDto.id()).thenReturn(400L);
        when(missionLifecycle.create(any(), eq("owner"))).thenReturn(createdDto);

        Mission m = new Mission();
        m.setId(400L);
        m.setCode("MIS-400");
        when(missions.findByIdForUpdate(400L)).thenReturn(Optional.of(m));
        when(missions.save(m)).thenReturn(m);
        ProjectSubscriptionResponse subResp = mock(ProjectSubscriptionResponse.class);
        when(mapper.toSubscriptionResponse(any(), eq(m), eq(m))).thenReturn(subResp);

        LocalDateTime explicitEnd = LocalDateTime.now().plusHours(10);
        ProjectSubscriptionResponse out =
                service.createSubscription(
                        10L,
                        new ProjectSubscriptionCreateRequest(
                                103L,
                                "{\"type\":\"Point\",\"coordinates\":[105.8,21.0]}",
                                SubscriptionScheduleType.MONTHLY,
                                LocalDate.now(),
                                null,
                                explicitEnd,
                                new BigDecimal("6"),
                                "  Explicit Field  ",
                                new BigDecimal("21.0285"),
                                new BigDecimal("105.8542"),
                                "priority"),
                        ownerAuth);
        assertSame(subResp, out);
        verify(realtime).publishOrderUpdated(eq(400L), any(), any(), eq(1L), eq(null), eq(null));
    }

    @Test
    void updateAndDeleteSubscriptionCoverAllBranches() {
        AppUser owner = user(1L, "owner");
        Authentication ownerAuth = auth("owner");
        Project p = project(10L, owner, "Farm");
        MarketplaceListing listing = new MarketplaceListing();
        listing.setMinBookingUnits(new BigDecimal("5"));

        ProjectSubscription sub = new ProjectSubscription();
        sub.setId(50L);
        sub.setProject(p);
        sub.setListing(listing);
        sub.setScheduleType(SubscriptionScheduleType.WEEKLY);
        sub.setStartDate(LocalDate.now().plusDays(1));
        sub.setStatus(ProjectSubscriptionStatus.ACTIVE);

        when(users.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(projects.findByIdAndDeletedFalse(10L)).thenReturn(Optional.of(p));

        // Not found on update & delete
        when(subscriptions.findByIdAndProjectIdAndDeletedFalse(999L, 10L))
                .thenReturn(Optional.empty());
        assertThrows(
                SystemException.class,
                () ->
                        service.updateSubscription(
                                10L,
                                999L,
                                new ProjectSubscriptionUpdateRequest(
                                        null, null, null, null, null, null, null),
                                ownerAuth));
        assertThrows(SystemException.class, () -> service.deleteSubscription(10L, 999L, ownerAuth));

        when(subscriptions.findByIdAndProjectIdAndDeletedFalse(50L, 10L))
                .thenReturn(Optional.of(sub));

        // Below min units on update
        assertThrows(
                SystemException.class,
                () ->
                        service.updateSubscription(
                                10L,
                                50L,
                                new ProjectSubscriptionUpdateRequest(
                                        null, null, null, new BigDecimal("2"), null, null, null),
                                ownerAuth));

        // Valid update recomputing nextRunDate
        when(subscriptions.save(sub)).thenReturn(sub);
        when(missions.findFirstBySubscriptionIdOrderByIdAsc(50L)).thenReturn(Optional.empty());
        when(missions.findFirstBySubscriptionIdOrderByIdDesc(50L)).thenReturn(Optional.empty());
        ProjectSubscriptionResponse subResp = mock(ProjectSubscriptionResponse.class);
        when(mapper.toSubscriptionResponse(sub, null, null)).thenReturn(subResp);

        LocalDate newStart = LocalDate.now().plusDays(5);
        assertSame(
                subResp,
                service.updateSubscription(
                        10L,
                        50L,
                        new ProjectSubscriptionUpdateRequest(
                                SubscriptionScheduleType.MONTHLY,
                                newStart,
                                null,
                                new BigDecimal("8"),
                                "{\"type\":\"Point\"}",
                                ProjectSubscriptionStatus.ACTIVE,
                                "updated"),
                        ownerAuth));
        assertEquals(newStart.plusMonths(1), sub.getNextRunDate());

        // Update with ENDED status & explicit nextRunDate
        LocalDate explicitNext = LocalDate.now().plusDays(20);
        service.updateSubscription(
                10L,
                50L,
                new ProjectSubscriptionUpdateRequest(
                        null,
                        null,
                        explicitNext,
                        null,
                        null,
                        ProjectSubscriptionStatus.ENDED,
                        null),
                ownerAuth);
        assertEquals(explicitNext, sub.getNextRunDate());

        // Delete subscription
        service.deleteSubscription(10L, 50L, ownerAuth);
        assertTrue(sub.isDeleted());
        assertEquals(ProjectSubscriptionStatus.ENDED, sub.getStatus());
        assertNull(sub.getNextRunDate());
    }
}
