package com.uav.platform.service.impl;

import static com.uav.platform.specification.ProjectSpecifications.belongsToCustomer;
import static com.uav.platform.specification.ProjectSpecifications.hasKeyword;
import static com.uav.platform.specification.ProjectSpecifications.hasProvince;
import static com.uav.platform.specification.ProjectSpecifications.hasStatus;
import static com.uav.platform.specification.ProjectSpecifications.notDeleted;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.OrderStatusGroups;
import com.uav.platform.common.util.SecureTokens;
import com.uav.platform.common.util.VietnamProvinceCoordinates;
import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IProjectDao;
import com.uav.platform.dao.IProjectSubscriptionDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.request.MissionCreateRequest;
import com.uav.platform.dto.request.ProjectCreateRequest;
import com.uav.platform.dto.request.ProjectSubscriptionCreateRequest;
import com.uav.platform.dto.request.ProjectSubscriptionUpdateRequest;
import com.uav.platform.dto.request.ProjectUpdateRequest;
import com.uav.platform.dto.response.ProjectResponse;
import com.uav.platform.dto.response.ProjectSubscriptionResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionEvent;
import com.uav.platform.entity.Project;
import com.uav.platform.entity.ProjectSubscription;
import com.uav.platform.enums.AuditAction;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.MissionEventType;
import com.uav.platform.enums.MissionPriority;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.ProjectStatus;
import com.uav.platform.enums.ProjectSubscriptionStatus;
import com.uav.platform.enums.ProviderOrderStatus;
import com.uav.platform.enums.SubscriptionScheduleType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.ProjectMapper;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.MissionLifecycleService;
import com.uav.platform.service.PermissionService;
import com.uav.platform.service.ProjectService;
import com.uav.platform.specification.ProjectSubscriptionSpecifications;
import com.uav.platform.transport.RealtimeEventBroadcaster;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class ProjectServiceImpl implements ProjectService {

    private final IProjectDao projects;
    private final IProjectSubscriptionDao subscriptions;
    private final IMarketplaceListingDao listings;
    private final IMissionDao missions;
    private final IMissionEventDao missionEvents;
    private final IUserDao users;
    private final PermissionService permissions;
    private final MissionLifecycleService missionLifecycle;
    private final AuditLogService audit;
    private final ProjectMapper mapper;

    @Autowired(required = false)
    private RealtimeEventBroadcaster realtime;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProjectResponse> listProjects(
            String keyword,
            String province,
            ProjectStatus status,
            Pageable pageable,
            Authentication auth) {
        AppUser actor = requireUser(auth);
        boolean viewAll = canViewAll(auth);
        HibernateSpecification<Project> spec =
                HibernateSpecification.allOf(
                        notDeleted(),
                        belongsToCustomer(viewAll ? null : actor.getId()),
                        hasKeyword(keyword),
                        hasProvince(province),
                        hasStatus(status));
        Page<Project> page = projects.findAll(spec, pageable);
        return PageResponse.from(page, this::toEnrichedProjectResponse);
    }

    @Override
    public ProjectResponse createProject(ProjectCreateRequest request, Authentication auth) {
        AppUser actor = requireUser(auth);
        Project project = new Project();
        project.setCustomer(actor);
        project.setCode(generateUniqueProjectCode());
        project.setName(request.name().trim());
        project.setProvince(trimOrNull(request.province()));
        project.setAreaGeoJson(trimOrNull(request.areaGeoJson()));
        project.setNote(trimOrNull(request.note()));
        project.setStatus(ProjectStatus.ACTIVE);
        project.setDeleted(false);
        Project saved = projects.save(project);
        audit.record(
                actor.getId(),
                actor.getUsername(),
                AuditAction.CREATE,
                "PROJECT",
                saved.getId().toString(),
                saved.getCode());
        return mapper.toProjectResponse(saved, 0L, 0L);
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getProject(Long projectId, Authentication auth) {
        Project project = requireAccessibleProject(projectId, auth);
        return toEnrichedProjectResponse(project);
    }

    @Override
    public ProjectResponse updateProject(
            Long projectId, ProjectUpdateRequest request, Authentication auth) {
        Project project = requireWritableProject(projectId, auth);
        if (request.name() != null && !request.name().isBlank()) {
            project.setName(request.name().trim());
        }
        if (request.province() != null) {
            project.setProvince(trimOrNull(request.province()));
        }
        if (request.areaGeoJson() != null) {
            project.setAreaGeoJson(trimOrNull(request.areaGeoJson()));
        }
        if (request.note() != null) {
            project.setNote(trimOrNull(request.note()));
        }
        if (request.status() != null) {
            project.setStatus(request.status());
        }
        Project saved = projects.save(project);
        audit.record(
                null,
                auth.getName(),
                AuditAction.UPDATE,
                "PROJECT",
                saved.getId().toString(),
                saved.getCode());
        return toEnrichedProjectResponse(saved);
    }

    @Override
    public void deleteProject(Long projectId, Authentication auth) {
        Project project = requireWritableProject(projectId, auth);
        if (missions.existsByProjectIdAndStatusNotIn(
                project.getId(), OrderStatusGroups.TERMINAL_NON_ACTIVE_STATUSES)) {
            throw SystemException.conflict(
                    "Không thể xoá dự án khi vẫn còn đơn dịch vụ đang chờ xử lý hoặc đang bay.",
                    "PROJECT_HAS_ACTIVE_ORDERS");
        }
        LocalDateTime now = LocalDateTime.now();
        for (ProjectSubscription sub :
                subscriptions.findByProjectIdAndDeletedFalse(project.getId())) {
            sub.setStatus(ProjectSubscriptionStatus.ENDED);
            sub.setNextRunDate(null);
            sub.setDeleted(true);
            sub.setDeletedAt(now);
            subscriptions.save(sub);
        }
        project.setStatus(ProjectStatus.ARCHIVED);
        project.setDeleted(true);
        project.setDeletedAt(now);
        projects.save(project);
        audit.record(
                null,
                auth.getName(),
                AuditAction.DELETE,
                "PROJECT",
                project.getId().toString(),
                project.getCode());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProjectSubscriptionResponse> listSubscriptions(
            Long projectId,
            ProjectSubscriptionStatus status,
            Pageable pageable,
            Authentication auth) {
        Project project = requireAccessibleProject(projectId, auth);
        HibernateSpecification<ProjectSubscription> spec =
                HibernateSpecification.allOf(
                        ProjectSubscriptionSpecifications.notDeleted(),
                        ProjectSubscriptionSpecifications.belongsToProject(project.getId()),
                        ProjectSubscriptionSpecifications.hasStatus(status));
        Page<ProjectSubscription> page = subscriptions.findAll(spec, pageable);
        return PageResponse.from(page, this::toEnrichedSubscriptionResponse);
    }

    @Override
    public ProjectSubscriptionResponse createSubscription(
            Long projectId, ProjectSubscriptionCreateRequest request, Authentication auth) {
        Project project = requireWritableProject(projectId, auth);
        AppUser customer = project.getCustomer();
        MarketplaceListing listing =
                listings.findWithDetailsById(request.listingId())
                        .filter(l -> !l.isDeleted())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                        "Không tìm thấy dịch vụ trên sàn.",
                                                        "LISTING_NOT_FOUND")
                                                .at("listingId"));
        if (listing.getModerationStatus() != ListingModerationStatus.PUBLISHED) {
            throw SystemException.conflict(
                            "Dịch vụ hiện không mở nhận đăng ký.", "LISTING_NOT_PUBLISHED")
                    .at("listingId");
        }
        if (listing.getProvider() != null
                && listing.getProvider().getUser() != null
                && Objects.equals(listing.getProvider().getUser().getId(), customer.getId())) {
            throw SystemException.conflict(
                    "Không thể tự đăng ký dịch vụ thuộc đội bay của chính mình.",
                    "SELF_BOOKING_FORBIDDEN");
        }

        BigDecimal minUnits =
                listing.getMinBookingUnits() != null
                        ? listing.getMinBookingUnits()
                        : BigDecimal.ONE;
        BigDecimal units =
                request.units() != null
                        ? request.units().setScale(2, RoundingMode.HALF_UP)
                        : minUnits;
        if (units.compareTo(minUnits) < 0) {
            throw SystemException.badRequest(
                            "Khối lượng đăng ký tối thiểu là " + minUnits + " đơn vị.",
                            "MIN_BOOKING_UNITS")
                    .at("units");
        }

        SubscriptionScheduleType scheduleType =
                request.scheduleType() != null
                        ? request.scheduleType()
                        : SubscriptionScheduleType.ONCE;
        LocalDate today = LocalDate.now();
        LocalDate startDate = request.startDate() != null ? request.startDate() : today.plusDays(1);
        if (startDate.isBefore(today)) {
            throw SystemException.badRequest(
                            "Ngày bắt đầu không được ở trong quá khứ.", "INVALID_START_DATE")
                    .at("startDate");
        }

        String effectiveAreaGeoJson =
                trimOrNull(request.areaGeoJson()) != null
                        ? trimOrNull(request.areaGeoJson())
                        : project.getAreaGeoJson();

        ProjectSubscription sub = new ProjectSubscription();
        sub.setProject(project);
        sub.setCustomer(customer);
        sub.setListing(listing);
        sub.setAreaGeoJson(effectiveAreaGeoJson);
        sub.setScheduleType(scheduleType);
        sub.setStartDate(startDate);
        sub.setNextRunDate(computeNextRunDate(scheduleType, startDate));
        sub.setUnits(units);
        sub.setStatus(ProjectSubscriptionStatus.ACTIVE);
        sub.setNote(trimOrNull(request.note()));
        sub.setDeleted(false);
        ProjectSubscription savedSub = subscriptions.save(sub);

        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        LocalDateTime startTime = request.startTime();
        if (startTime == null) {
            startTime = startDate.atTime(8, 30);
            if (!startTime.isAfter(now.plusMinutes(90))) {
                startTime = now.plusHours(3);
            }
        }
        LocalDateTime endTime =
                request.expectedEndTime() != null && request.expectedEndTime().isAfter(startTime)
                        ? request.expectedEndTime()
                        : startTime.plusHours(2);

        BigDecimal[] coords = resolveCoordinates(request, effectiveAreaGeoJson, project, listing);
        String locationName =
                trimOrNull(request.locationName()) != null
                        ? request.locationName().trim()
                        : buildLocationName(project, listing);
        String title = listing.getTitle() + " · " + project.getName();
        if (title.length() > 180) {
            title = title.substring(0, 180);
        }

        var createdMissionDto =
                missionLifecycle.create(
                        new MissionCreateRequest(
                                listing.getMissionType(),
                                title,
                                sub.getNote() != null ? sub.getNote() : project.getNote(),
                                startTime.toLocalDate(),
                                startTime,
                                endTime,
                                locationName,
                                coords[0],
                                coords[1],
                                listing.getCategoryService() != null
                                        ? listing.getCategoryService().getId()
                                        : null,
                                MissionPriority.NORMAL,
                                sub.getNote(),
                                null,
                                listing.getId(),
                                units,
                                false),
                        customer.getUsername());

        Mission firstMission =
                missions.findByIdForUpdate(createdMissionDto.id())
                        .orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
        firstMission.setProject(project);
        firstMission.setSubscription(savedSub);
        // Platform stands between customer and fleet: order enters PENDING_DISPATCH queue.
        firstMission.setProvider(null);
        firstMission.setStatus(MissionStatus.PENDING_CONFIRMATION);
        firstMission.setProviderResponseStatus(ProviderOrderStatus.PENDING_DISPATCH);
        Mission savedMission = missions.save(firstMission);

        missionEvents.save(
                new MissionEvent(
                        savedMission,
                        MissionEventType.SUBMITTED,
                        customer,
                        MissionStatus.DRAFT,
                        MissionStatus.PENDING_CONFIRMATION,
                        "Đăng ký dịch vụ cho dự án "
                                + project.getName()
                                + " — chờ nền tảng giao đội bay",
                        null));

        audit.record(
                customer.getId(),
                auth.getName(),
                AuditAction.CREATE,
                "PROJECT_SUBSCRIPTION",
                savedSub.getId().toString(),
                project.getCode() + ":" + savedMission.getCode());

        if (realtime != null) {
            realtime.publishOrderUpdated(
                    savedMission.getId(),
                    savedMission.getStatus().name(),
                    OrderStatusGroups.PENDING,
                    customer.getId(),
                    null,
                    null);
        }

        return mapper.toSubscriptionResponse(savedSub, savedMission, savedMission);
    }

    @Override
    public ProjectSubscriptionResponse updateSubscription(
            Long projectId,
            Long subscriptionId,
            ProjectSubscriptionUpdateRequest request,
            Authentication auth) {
        Project project = requireWritableProject(projectId, auth);
        ProjectSubscription sub =
                subscriptions
                        .findByIdAndProjectIdAndDeletedFalse(subscriptionId, project.getId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy gói đăng ký dịch vụ.",
                                                "SUBSCRIPTION_NOT_FOUND"));
        if (request.scheduleType() != null) {
            sub.setScheduleType(request.scheduleType());
        }
        if (request.startDate() != null) {
            sub.setStartDate(request.startDate());
        }
        if (request.units() != null) {
            BigDecimal minUnits =
                    sub.getListing() != null && sub.getListing().getMinBookingUnits() != null
                            ? sub.getListing().getMinBookingUnits()
                            : BigDecimal.ONE;
            if (request.units().compareTo(minUnits) < 0) {
                throw SystemException.badRequest(
                                "Khối lượng tối thiểu là " + minUnits + " đơn vị.",
                                "MIN_BOOKING_UNITS")
                        .at("units");
            }
            sub.setUnits(request.units().setScale(2, RoundingMode.HALF_UP));
        }
        if (request.areaGeoJson() != null) {
            sub.setAreaGeoJson(trimOrNull(request.areaGeoJson()));
        }
        if (request.note() != null) {
            sub.setNote(trimOrNull(request.note()));
        }
        if (request.status() != null) {
            sub.setStatus(request.status());
            if (request.status() == ProjectSubscriptionStatus.ENDED) {
                sub.setNextRunDate(null);
            }
        }
        if (request.nextRunDate() != null) {
            sub.setNextRunDate(request.nextRunDate());
        } else if (sub.getStatus() == ProjectSubscriptionStatus.ACTIVE
                && (request.scheduleType() != null || request.startDate() != null)) {
            sub.setNextRunDate(computeNextRunDate(sub.getScheduleType(), sub.getStartDate()));
        }

        ProjectSubscription saved = subscriptions.save(sub);
        audit.record(
                null,
                auth.getName(),
                AuditAction.UPDATE,
                "PROJECT_SUBSCRIPTION",
                saved.getId().toString(),
                project.getCode());
        return toEnrichedSubscriptionResponse(saved);
    }

    @Override
    public void deleteSubscription(Long projectId, Long subscriptionId, Authentication auth) {
        Project project = requireWritableProject(projectId, auth);
        ProjectSubscription sub =
                subscriptions
                        .findByIdAndProjectIdAndDeletedFalse(subscriptionId, project.getId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy gói đăng ký dịch vụ.",
                                                "SUBSCRIPTION_NOT_FOUND"));
        sub.setStatus(ProjectSubscriptionStatus.ENDED);
        sub.setNextRunDate(null);
        sub.setDeleted(true);
        sub.setDeletedAt(LocalDateTime.now());
        subscriptions.save(sub);
        audit.record(
                null,
                auth.getName(),
                AuditAction.DELETE,
                "PROJECT_SUBSCRIPTION",
                sub.getId().toString(),
                project.getCode());
    }

    private ProjectResponse toEnrichedProjectResponse(Project project) {
        long activeSubs =
                subscriptions.countByProjectIdAndDeletedFalseAndStatus(
                        project.getId(), ProjectSubscriptionStatus.ACTIVE);
        long missionCount = missions.countByProjectId(project.getId());
        return mapper.toProjectResponse(project, activeSubs, missionCount);
    }

    private ProjectSubscriptionResponse toEnrichedSubscriptionResponse(ProjectSubscription sub) {
        Mission first = missions.findFirstBySubscriptionIdOrderByIdAsc(sub.getId()).orElse(null);
        Mission latest = missions.findFirstBySubscriptionIdOrderByIdDesc(sub.getId()).orElse(null);
        return mapper.toSubscriptionResponse(sub, first, latest);
    }

    private Project requireAccessibleProject(Long projectId, Authentication auth) {
        AppUser actor = requireUser(auth);
        Project project =
                projects.findByIdAndDeletedFalse(projectId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy dự án.", "PROJECT_NOT_FOUND"));
        if (!canViewAll(auth)
                && (project.getCustomer() == null
                        || !Objects.equals(project.getCustomer().getId(), actor.getId()))) {
            throw new AccessDeniedException("Project is not visible to this user");
        }
        return project;
    }

    private Project requireWritableProject(Long projectId, Authentication auth) {
        AppUser actor = requireUser(auth);
        Project project =
                projects.findByIdAndDeletedFalse(projectId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy dự án.", "PROJECT_NOT_FOUND"));
        boolean isOwner =
                project.getCustomer() != null
                        && Objects.equals(project.getCustomer().getId(), actor.getId());
        if (!isOwner
                && !permissions.has(auth, "USER_MANAGE")
                && !permissions.has(auth, "MARKETPLACE_MODERATE")) {
            throw new AccessDeniedException("Only project owner can modify this project");
        }
        return project;
    }

    private boolean canViewAll(Authentication auth) {
        return auth != null
                && (permissions.has(auth, "MISSION_VIEW_ALL")
                        || permissions.has(auth, "MARKETPLACE_MODERATE")
                        || permissions.has(auth, "USER_MANAGE"));
    }

    private AppUser requireUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw SystemException.unauthorized("Vui lòng đăng nhập để tiếp tục.");
        }
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> SystemException.notFound("USER_NOT_FOUND"));
    }

    private String generateUniqueProjectCode() {
        for (int i = 0; i < 10; i++) {
            String candidate =
                    "PRJ-"
                            + LocalDate.now().getYear()
                            + "-"
                            + SecureTokens.hex(3).toUpperCase(Locale.ROOT);
            if (!projects.existsByCode(candidate)) {
                return candidate;
            }
        }
        return "PRJ-" + SecureTokens.hex(6).toUpperCase(Locale.ROOT);
    }

    private static LocalDate computeNextRunDate(
            SubscriptionScheduleType scheduleType, LocalDate startDate) {
        if (scheduleType == null || startDate == null) {
            return null;
        }
        return switch (scheduleType) {
            case ONCE -> null;
            case WEEKLY -> startDate.plusWeeks(1);
            case MONTHLY -> startDate.plusMonths(1);
        };
    }

    private static BigDecimal[] resolveCoordinates(
            ProjectSubscriptionCreateRequest request,
            String effectiveGeoJson,
            Project project,
            MarketplaceListing listing) {
        if (request.latitude() != null && request.longitude() != null) {
            return new BigDecimal[] {request.latitude(), request.longitude()};
        }
        BigDecimal[] fromGeoJson =
                VietnamProvinceCoordinates.extractGeoJsonCentroid(effectiveGeoJson);
        if (fromGeoJson != null) {
            return fromGeoJson;
        }
        String province =
                project.getProvince() != null ? project.getProvince() : listing.getProvince();
        double[] center = VietnamProvinceCoordinates.resolveForProvince(province);
        return new BigDecimal[] {
            BigDecimal.valueOf(center[0]).setScale(7, RoundingMode.HALF_UP),
            BigDecimal.valueOf(center[1]).setScale(7, RoundingMode.HALF_UP)
        };
    }

    private static String buildLocationName(Project project, MarketplaceListing listing) {
        String base = project.getName();
        String province =
                project.getProvince() != null ? project.getProvince() : listing.getProvince();
        if (province != null && !province.isBlank()) {
            base = base + " · " + province.trim();
        }
        return base.length() > 255 ? base.substring(0, 255) : base;
    }

    private static String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
