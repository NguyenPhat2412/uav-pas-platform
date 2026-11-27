package com.uav.platform.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.OrderStatusGroups;
import com.uav.platform.common.util.VietnamProvinceCoordinates;
import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IMissionReviewDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.request.AutoDispatchRequest;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.dto.request.ManualDispatchRequest;
import com.uav.platform.dto.response.DispatchCandidateProviderResponse;
import com.uav.platform.dto.response.DispatchQueueItemResponse;
import com.uav.platform.dto.response.MarketplaceAdminStatsResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Invoice;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionEvent;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.AuditAction;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.MissionEventType;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.enums.ProviderOrderStatus;
import com.uav.platform.enums.ProviderVerificationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.MissionMapper;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.MarketplaceDispatchService;
import com.uav.platform.service.NotificationService;
import com.uav.platform.specification.MarketplaceSpecifications;
import com.uav.platform.specification.MissionSpecifications;
import com.uav.platform.transport.RealtimeEventBroadcaster;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class MarketplaceDispatchServiceImpl implements MarketplaceDispatchService {

    private final IMissionDao missions;
    private final IMissionEventDao missionEvents;
    private final IMissionReviewDao reviews;
    private final IProviderProfileDao providers;
    private final IMarketplaceListingDao listings;
    private final IUavDao uavs;
    private final IInvoiceDao invoices;
    private final IUserDao users;
    private final AuditLogService audit;
    private final MissionMapper missionMapper;

    @Autowired(required = false)
    private ObjectProvider<NotificationService> notifications;

    @Autowired(required = false)
    private RealtimeEventBroadcaster realtime;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DispatchQueueItemResponse> listDispatchQueue(Pageable pageable) {
        HibernateSpecification<Mission> spec = pendingDispatchSpecification();
        Pageable sorted =
                PageRequest.of(
                        Math.max(0, pageable.getPageNumber()),
                        Math.min(Math.max(pageable.getPageSize(), 1), 50),
                        Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id")));
        Page<Mission> page = missions.findAll(spec, sorted);
        List<ProviderProfile> verifiedProviders =
                providers.findAll(
                        MarketplaceSpecifications.providerStatus(
                                ProviderVerificationStatus.VERIFIED));
        return PageResponse.from(
                page,
                mission ->
                        new DispatchQueueItemResponse(
                                missionMapper.toResponse(mission),
                                rankCandidates(mission, verifiedProviders)));
    }

    @Override
    public MissionResponse dispatchManual(
            Long missionId, ManualDispatchRequest request, String adminUsername) {
        Mission mission =
                missions.findByIdForUpdate(missionId)
                        .orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
        if (mission.getStatus() == MissionStatus.IN_PROGRESS
                || mission.getStatus() == MissionStatus.COMPLETED
                || mission.getStatus() == MissionStatus.CANCELLED
                || mission.getStatus() == MissionStatus.FAILED) {
            throw SystemException.conflict(
                    "Đơn hàng hiện không ở trạng thái cho phép giao đội bay.",
                    "DISPATCH_INVALID_STATUS");
        }
        ProviderProfile provider =
                providers
                        .findById(request.providerId())
                        .orElseThrow(() -> SystemException.notFound("PROVIDER_NOT_FOUND"));
        if (provider.getVerificationStatus() != ProviderVerificationStatus.VERIFIED) {
            throw SystemException.conflict(
                    "Chỉ được giao đơn cho đội bay ở trạng thái Đã xác minh.",
                    "PROVIDER_NOT_VERIFIED");
        }
        if (mission.getCustomer() != null
                && provider.getUser() != null
                && Objects.equals(mission.getCustomer().getId(), provider.getUser().getId())) {
            throw SystemException.conflict(
                    "Không thể giao đơn cho đội bay của chính khách hàng đặt đơn.",
                    "SELF_DISPATCH_FORBIDDEN");
        }

        MissionStatus previous = mission.getStatus();
        mission.setProvider(provider);
        mission.setOperator(null);
        mission.setUav(null);
        mission.setOperatorAccepted(false);
        mission.setStatus(MissionStatus.PENDING_CONFIRMATION);
        mission.setProviderResponseStatus(ProviderOrderStatus.PENDING_PROVIDER);
        mission.setProviderResponseNote(trimOrNull(request.note()));
        Mission saved = missions.save(mission);

        AppUser actor = users.findByUsername(adminUsername).orElse(null);
        missionEvents.save(
                new MissionEvent(
                        saved,
                        MissionEventType.STATUS_CHANGED,
                        actor,
                        previous,
                        saved.getStatus(),
                        "Nền tảng đã giao đơn cho đội bay " + provider.getDisplayName(),
                        trimOrNull(request.note())));
        audit.record(
                actor != null ? actor.getId() : null,
                adminUsername,
                AuditAction.UPDATE,
                "MISSION_DISPATCH",
                saved.getId().toString(),
                "providerId=" + provider.getId());

        notifyProvider(
                provider,
                "Đơn mới được giao " + saved.getCode(),
                "Nền tảng vừa giao đơn dịch vụ " + saved.getTitle() + " cho đội bay của bạn.",
                saved.getId());

        if (realtime != null) {
            realtime.publishOrderUpdated(
                    saved.getId(),
                    saved.getStatus().name(),
                    OrderStatusGroups.PENDING,
                    saved.getCustomer() != null ? saved.getCustomer().getId() : null,
                    provider.getUser() != null ? provider.getUser().getId() : null,
                    null);
        }

        return missionMapper.toResponse(saved);
    }

    @Override
    public MissionResponse dispatchAuto(Long missionId, String note, String adminUsername) {
        Mission mission =
                missions.findById(missionId)
                        .orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
        List<ProviderProfile> verifiedProviders =
                providers.findAll(
                        MarketplaceSpecifications.providerStatus(
                                ProviderVerificationStatus.VERIFIED));
        List<DispatchCandidateProviderResponse> candidates =
                rankCandidates(mission, verifiedProviders);
        if (candidates.isEmpty()) {
            throw SystemException.conflict(
                    "Không tìm thấy đội bay đã xác minh phù hợp để giao tự động.",
                    "NO_ELIGIBLE_PROVIDER");
        }
        DispatchCandidateProviderResponse best =
                candidates.stream()
                        .filter(c -> c.availableUavCount() > 0)
                        .findFirst()
                        .orElse(candidates.get(0));
        String autoNote =
                (note != null && !note.isBlank())
                        ? note.trim()
                        : "Giao tự động theo xếp hạng phù hợp #"
                                + best.providerId()
                                + " (điểm "
                                + best.score()
                                + ")";
        return dispatchManual(
                missionId, new ManualDispatchRequest(best.providerId(), autoNote), adminUsername);
    }

    @Override
    public MissionResponse dispatchAutoNext(AutoDispatchRequest request, String adminUsername) {
        if (request != null && request.missionId() != null) {
            return dispatchAuto(request.missionId(), request.note(), adminUsername);
        }
        Page<Mission> oldest =
                missions.findAll(
                        pendingDispatchSpecification(),
                        PageRequest.of(
                                0, 1, Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"))));
        if (oldest.isEmpty()) {
            throw SystemException.conflict(
                    "Hiện không có đơn nào đang chờ giao đội bay.", "DISPATCH_QUEUE_EMPTY");
        }
        return dispatchAuto(
                oldest.getContent().get(0).getId(),
                request != null ? request.note() : null,
                adminUsername);
    }

    @Override
    @Transactional(readOnly = true)
    public MarketplaceAdminStatsResponse getStats() {
        List<Mission> allMissions = missions.findAll();
        long totalOrders = allMissions.size();
        long pendingDispatch = 0;
        long pendingProvider = 0;
        long scheduled = 0;
        long inFlight = 0;
        long completedTotal = 0;
        long cancelled = 0;
        BigDecimal illustrativeGross = BigDecimal.ZERO;

        for (Mission m : allMissions) {
            MissionStatus st = m.getStatus();
            if (st == MissionStatus.PENDING_CONFIRMATION || st == MissionStatus.DRAFT) {
                if (m.getProviderResponseStatus() == ProviderOrderStatus.PENDING_DISPATCH) {
                    pendingDispatch++;
                } else {
                    pendingProvider++;
                }
            } else if (OrderStatusGroups.SCHEDULED_STATUSES.contains(st)) {
                scheduled++;
            } else if (st == MissionStatus.IN_PROGRESS) {
                inFlight++;
            } else if (st == MissionStatus.COMPLETED) {
                completedTotal++;
                if (m.getQuotedSubtotalVnd() != null) {
                    illustrativeGross = illustrativeGross.add(m.getQuotedSubtotalVnd());
                }
            } else if (OrderStatusGroups.CANCELLED_STATUSES.contains(st)) {
                cancelled++;
            }
        }

        long reviewedCount = reviews.count();
        long deliveredCount = completedTotal;

        long activeProviders =
                providers.count(
                        MarketplaceSpecifications.providerStatus(
                                ProviderVerificationStatus.VERIFIED));
        long pendingProviders =
                providers.count(
                        MarketplaceSpecifications.providerStatus(
                                ProviderVerificationStatus.PENDING_REVIEW));
        long publishedListings =
                listings.count(
                        HibernateSpecification.allOf(
                                MarketplaceSpecifications.listingNotDeleted(),
                                MarketplaceSpecifications.listingModerationStatus(
                                        ListingModerationStatus.PUBLISHED)));
        long pendingListings =
                listings.count(
                        HibernateSpecification.allOf(
                                MarketplaceSpecifications.listingNotDeleted(),
                                MarketplaceSpecifications.listingModerationStatus(
                                        ListingModerationStatus.PENDING_REVIEW)));

        BigDecimal illustrativeFee = BigDecimal.ZERO;
        for (Invoice inv : invoices.findAll()) {
            if (inv.getStatus() == InvoiceStatus.PAID && inv.getPlatformFeeVnd() != null) {
                illustrativeFee = illustrativeFee.add(inv.getPlatformFeeVnd());
            }
        }
        if (illustrativeFee.signum() == 0 && illustrativeGross.signum() > 0) {
            illustrativeFee =
                    illustrativeGross
                            .multiply(new BigDecimal("0.10"))
                            .setScale(0, RoundingMode.HALF_UP);
        }

        return new MarketplaceAdminStatsResponse(
                totalOrders,
                pendingDispatch,
                pendingProvider,
                scheduled,
                inFlight,
                deliveredCount,
                reviewedCount,
                cancelled,
                activeProviders,
                pendingProviders,
                publishedListings,
                pendingListings,
                illustrativeGross.setScale(0, RoundingMode.HALF_UP),
                illustrativeFee.setScale(0, RoundingMode.HALF_UP),
                "Số liệu doanh thu & phí đối soát minh hoạ trên nền tảng demo");
    }

    private List<DispatchCandidateProviderResponse> rankCandidates(
            Mission mission, List<ProviderProfile> verifiedProviders) {
        double[] missionCoords = resolveMissionCoords(mission);
        Long customerId = mission.getCustomer() != null ? mission.getCustomer().getId() : null;
        Long preferredProviderId =
                mission.getListing() != null && mission.getListing().getProvider() != null
                        ? mission.getListing().getProvider().getId()
                        : null;

        List<DispatchCandidateProviderResponse> out = new ArrayList<>();
        for (ProviderProfile p : verifiedProviders) {
            if (p.getUser() != null && Objects.equals(p.getUser().getId(), customerId)) {
                continue;
            }
            double[] providerCoords =
                    VietnamProvinceCoordinates.resolveForProvince(p.getProvince());
            double distanceKm =
                    VietnamProvinceCoordinates.haversineKm(
                            missionCoords[0],
                            missionCoords[1],
                            providerCoords[0],
                            providerCoords[1]);
            int availableUavs = countAvailableUavs(p.getId(), mission);
            BigDecimal rating = p.getRatingAvg() != null ? p.getRatingAvg() : BigDecimal.ZERO;

            double distanceScore = Math.max(0.0, 35.0 - distanceKm * 0.08);
            if (distanceKm <= Math.max(50, p.getServiceRadiusKm())) {
                distanceScore += 10.0;
            }
            double fleetScore = availableUavs > 0 ? Math.min(availableUavs * 6.0, 24.0) : -20.0;
            double ratingScore = rating.doubleValue() * 5.0;
            double expScore = Math.min(p.getCompletedMissionsCount() * 0.8, 12.0);
            double preferredBonus = Objects.equals(preferredProviderId, p.getId()) ? 8.0 : 0.0;
            double totalScore =
                    Math.round(
                                    (50.0
                                                    + distanceScore
                                                    + fleetScore
                                                    + ratingScore
                                                    + expScore
                                                    + preferredBonus)
                                            * 10.0)
                            / 10.0;

            out.add(
                    new DispatchCandidateProviderResponse(
                            p.getId(),
                            p.getDisplayName(),
                            p.getProvince(),
                            distanceKm,
                            availableUavs,
                            rating,
                            p.getCompletedMissionsCount(),
                            totalScore));
        }

        out.sort(
                Comparator.comparingDouble(DispatchCandidateProviderResponse::score)
                        .reversed()
                        .thenComparing(
                                Comparator.comparingInt(
                                                DispatchCandidateProviderResponse
                                                        ::availableUavCount)
                                        .reversed())
                        .thenComparingDouble(DispatchCandidateProviderResponse::distanceKm));
        return out;
    }

    private int countAvailableUavs(Long providerId, Mission mission) {
        List<Uav> fleet = uavs.findByProviderIdOrderByIdDesc(providerId);
        int free = 0;
        for (Uav uav : fleet) {
            if (uav.getStatus() != UavStatus.AVAILABLE) {
                continue;
            }
            boolean busy =
                    mission.getStartTime() != null
                            && mission.getExpectedEndTime() != null
                            && missions.exists(
                                    MissionSpecifications.overlappingUav(
                                            uav.getId(),
                                            OrderStatusGroups.TERMINAL_NON_ACTIVE_STATUSES,
                                            mission.getStartTime(),
                                            mission.getExpectedEndTime()));
            if (!busy) {
                free++;
            }
        }
        return free;
    }

    private static double[] resolveMissionCoords(Mission mission) {
        if (mission.getLatitude() != null && mission.getLongitude() != null) {
            return new double[] {
                mission.getLatitude().doubleValue(), mission.getLongitude().doubleValue()
            };
        }
        String province =
                mission.getProject() != null && mission.getProject().getProvince() != null
                        ? mission.getProject().getProvince()
                        : (mission.getListing() != null
                                ? mission.getListing().getProvince()
                                : mission.getLocationName());
        return VietnamProvinceCoordinates.resolveForProvince(province);
    }

    private static HibernateSpecification<Mission> pendingDispatchSpecification() {
        return (root, query, cb) ->
                cb.and(
                        cb.equal(
                                root.get("providerResponseStatus"),
                                ProviderOrderStatus.PENDING_DISPATCH),
                        cb.equal(root.get("status"), MissionStatus.PENDING_CONFIRMATION));
    }

    private void notifyProvider(
            ProviderProfile provider, String title, String content, Long missionId) {
        if (provider == null
                || provider.getUser() == null
                || provider.getUser().getId() == null
                || notifications == null) {
            return;
        }
        NotificationService svc = notifications.getIfAvailable();
        if (svc == null) {
            return;
        }
        try {
            svc.sendNotification(
                    new CreateNotificationRequest(
                            provider.getUser().getId(),
                            title,
                            content,
                            NotificationType.MISSION_ASSIGNED,
                            "MISSION",
                            missionId));
        } catch (RuntimeException ignored) {
            // Best-effort notification.
        }
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
