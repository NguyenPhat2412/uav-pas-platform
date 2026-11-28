package com.uav.platform.service.impl;

import com.uav.platform.common.util.OrderStatusGroups;
import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IMissionBidDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IProviderDocumentDao;
import com.uav.platform.dao.IProviderPayoutDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IProviderWalletDao;
import com.uav.platform.dao.IServiceOfferingDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.IWalletTransactionDao;
import com.uav.platform.dto.request.MarketplaceListingUpsertRequest;
import com.uav.platform.dto.request.MissionBidCreateRequest;
import com.uav.platform.dto.request.PayoutCreateRequest;
import com.uav.platform.dto.request.ProviderDocumentCreateRequest;
import com.uav.platform.dto.request.ProviderEquipmentCreateRequest;
import com.uav.platform.dto.request.ProviderOnboardingRequest;
import com.uav.platform.dto.request.ProviderOrderActionRequest;
import com.uav.platform.dto.request.ProviderOrderCompleteRequest;
import com.uav.platform.dto.request.ProviderUavCreateRequest;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.MissionBidResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.dto.response.ProviderDocumentResponse;
import com.uav.platform.dto.response.ProviderEquipmentResponse;
import com.uav.platform.dto.response.ProviderFleetSummaryResponse;
import com.uav.platform.dto.response.ProviderPayoutResponse;
import com.uav.platform.dto.response.ProviderProfileResponse;
import com.uav.platform.dto.response.ProviderUavResponse;
import com.uav.platform.dto.response.ProviderWalletResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionBid;
import com.uav.platform.entity.MissionEvent;
import com.uav.platform.entity.ProviderDocument;
import com.uav.platform.entity.ProviderPayout;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.ProviderWallet;
import com.uav.platform.entity.ServiceOffering;
import com.uav.platform.entity.Uav;
import com.uav.platform.entity.WalletTransaction;
import com.uav.platform.enums.AuditAction;
import com.uav.platform.enums.EquipmentStatus;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.MissionBidStatus;
import com.uav.platform.enums.MissionEventType;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.ProviderDocumentStatus;
import com.uav.platform.enums.ProviderOrderStatus;
import com.uav.platform.enums.ProviderVerificationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.MarketplaceMapper;
import com.uav.platform.mapper.MissionMapper;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.MarketplaceEscrowService;
import com.uav.platform.service.MarketplaceProviderService;
import com.uav.platform.service.MissionAccessService;
import com.uav.platform.service.MissionResourceService;
import com.uav.platform.service.SystemConfigService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class MarketplaceProviderServiceImpl implements MarketplaceProviderService {

    private static final Set<MissionStatus> OPEN_RFQ_STATUSES =
            Set.of(MissionStatus.DRAFT, MissionStatus.PENDING_CONFIRMATION);

    private final IUserDao users;
    private final IProviderProfileDao providers;
    private final IProviderDocumentDao documents;
    private final IMarketplaceListingDao listings;
    private final IProviderWalletDao wallets;
    private final IProviderPayoutDao payouts;
    private final IWalletTransactionDao ledger;
    private final IMissionBidDao bids;
    private final IServiceOfferingDao serviceOfferings;
    private final IMediaAssetDao mediaAssets;
    private final IUavDao uavs;
    private final IEquipmentDao equipmentRepository;
    private final IMissionDao missions;
    private final IMissionEventDao missionEvents;
    private final IInvoiceDao invoices;
    private final MissionAccessService missionAccess;
    private final MissionResourceService resources;
    private final MarketplaceEscrowService escrowService;
    private final SystemConfigService systemConfig;
    private final AuditLogService audit;
    private final MarketplaceMapper mapper;
    private final MissionMapper missionMapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.beans.factory.ObjectProvider<
                    com.uav.platform.service.NotificationService>
            notifications;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.uav.platform.dao.IProviderPilotDao pilots;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.uav.platform.service.SimulationService simulationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.uav.platform.transport.RealtimeEventBroadcaster realtime;

    private void publishOrderUpdated(Mission mission, String statusGroup) {
        if (realtime == null || mission == null) {
            return;
        }
        Long customerUserId = mission.getCustomer() != null ? mission.getCustomer().getId() : null;
        Long providerUserId =
                mission.getProvider() != null && mission.getProvider().getUser() != null
                        ? mission.getProvider().getUser().getId()
                        : null;
        Long operatorUserId = mission.getOperator() != null ? mission.getOperator().getId() : null;
        realtime.publishOrderUpdated(
                mission.getId(),
                mission.getStatus().name(),
                statusGroup,
                customerUserId,
                providerUserId,
                operatorUserId);
    }

    private void notifyUser(
            AppUser target,
            String title,
            String content,
            com.uav.platform.enums.NotificationType type,
            String refType,
            Long refId) {
        if (target == null || target.getId() == null || notifications == null) return;
        var svc = notifications.getIfAvailable();
        if (svc == null) return;
        try {
            svc.sendNotification(
                    new com.uav.platform.dto.request.CreateNotificationRequest(
                            target.getId(), title, content, type, refType, refId));
        } catch (RuntimeException ignored) {
            // Best-effort realtime notification.
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProviderProfileResponse> findMyProfile(String username) {
        return providers
                .findByUserUsername(username)
                .map(
                        profile ->
                                mapper.toProfileResponse(
                                        profile,
                                        documents.findByProviderIdOrderByCreatedAtDesc(
                                                profile.getId())));
    }

    @Override
    public ProviderProfileResponse upsertMyProfile(
            ProviderOnboardingRequest request, String username) {
        AppUser user = requireUser(username);
        ProviderProfile profile =
                providers
                        .findByUserId(user.getId())
                        .orElseGet(
                                () -> {
                                    ProviderProfile created = new ProviderProfile();
                                    created.setUser(user);
                                    created.setSlug(
                                            MarketplaceSlugOperations.uniqueSlug(
                                                    request.displayName(),
                                                    "provider",
                                                    providers::existsBySlug));
                                    return created;
                                });
        if (profile.getVerificationStatus() == ProviderVerificationStatus.SUSPENDED) {
            throw SystemException.forbidden(
                    "Tài khoản đối tác đang bị tạm đình chỉ, vui lòng liên hệ quản trị viên.",
                    "PROVIDER_SUSPENDED");
        }
        int defaultRadius =
                SystemConfigurationOperations.intOrDefault(
                        systemConfig, "marketplace.default_service_radius_km", 100);
        MarketplaceProviderOperations.applyProfileFields(profile, request, defaultRadius);

        ProviderProfile saved = providers.save(profile);
        if (wallets.findByProviderId(saved.getId()).isEmpty()) {
            ProviderWallet wallet = new ProviderWallet();
            wallet.setProvider(saved);
            wallets.save(wallet);
        }
        audit.record(
                user.getId(),
                username,
                AuditAction.UPDATE,
                "PROVIDER_PROFILE",
                saved.getId().toString(),
                saved.getSlug());
        return mapper.toProfileResponse(
                saved, documents.findByProviderIdOrderByCreatedAtDesc(saved.getId()));
    }

    @Override
    public ProviderProfileResponse submitForVerification(String username) {
        ProviderProfile provider = requireOwnedProfile(username);
        if (provider.getVerificationStatus() == ProviderVerificationStatus.SUSPENDED) {
            throw SystemException.forbidden(
                    "Tài khoản đối tác đang bị tạm đình chỉ, vui lòng liên hệ quản trị viên.",
                    "PROVIDER_SUSPENDED");
        }
        if (provider.getVerificationStatus() == ProviderVerificationStatus.VERIFIED) {
            throw SystemException.conflict(
                    "Hồ sơ đối tác đã được xác minh (VERIFIED).", "PROVIDER_ALREADY_VERIFIED");
        }
        List<ProviderDocument> docs =
                documents.findByProviderIdOrderByCreatedAtDesc(provider.getId());
        List<String> missing =
                MarketplaceProviderOperations.missingRequiredDocuments(provider, docs);
        if (!missing.isEmpty()) {
            throw SystemException.badRequest(
                            "Thiếu hồ sơ pháp lý bắt buộc trước khi gửi thẩm định: "
                                    + String.join(", ", missing),
                            "REQUIRED_DOCUMENTS_MISSING")
                    .at("documents");
        }
        provider.setVerificationStatus(ProviderVerificationStatus.PENDING_REVIEW);
        ProviderProfile saved = providers.save(provider);
        audit.record(
                saved.getUser() != null ? saved.getUser().getId() : null,
                username,
                AuditAction.UPDATE,
                "PROVIDER_PROFILE",
                saved.getId().toString(),
                "SUBMIT_VERIFICATION");
        return mapper.toProfileResponse(saved, docs);
    }

    @Override
    public ProviderDocumentResponse addDocument(
            ProviderDocumentCreateRequest request, String username) {
        ProviderProfile provider = requireOwnedProfile(username);
        if (provider.getVerificationStatus() == ProviderVerificationStatus.SUSPENDED) {
            throw SystemException.forbidden(
                    "Tài khoản đối tác đang bị tạm đình chỉ, không thể cập nhật hồ sơ.",
                    "PROVIDER_SUSPENDED");
        }
        String cleanUrl = validateOptionalHttpUrl(request.fileUrl(), "fileUrl");
        ProviderDocument doc = new ProviderDocument();
        doc.setProvider(provider);
        doc.setDocumentType(request.documentType());
        doc.setTitle(request.title().trim());
        doc.setDocumentNumber(trimOrNull(request.documentNumber()));
        doc.setFileUrl(cleanUrl);
        if (request.mediaAssetId() != null) {
            MediaAsset media =
                    mediaAssets
                            .findById(request.mediaAssetId())
                            .orElseThrow(
                                    () ->
                                            SystemException.notFound("MEDIA_NOT_FOUND")
                                                    .at("mediaAssetId"));
            if (media.isDeleted() || !Objects.equals(media.getUploadedBy(), username)) {
                throw SystemException.forbidden(
                                "Không có quyền đính kèm tệp tài liệu của người dùng khác.",
                                "MEDIA_ACCESS_DENIED")
                        .at("mediaAssetId");
            }
            doc.setMediaAsset(media);
        }
        if (cleanUrl == null && doc.getMediaAsset() == null) {
            throw SystemException.badRequest(
                            "Vui lòng nhập đường dẫn hồ sơ (https://...) hoặc đính kèm tệp tài liệu.",
                            "DOCUMENT_SOURCE_REQUIRED")
                    .at("fileUrl");
        }
        doc.setStatus(ProviderDocumentStatus.PENDING);
        return mapper.toDocumentResponse(documents.save(doc));
    }

    @Override
    public void deleteDocument(Long documentId, String username) {
        ProviderProfile provider = requireOwnedProfile(username);
        if (provider.getVerificationStatus() == ProviderVerificationStatus.SUSPENDED) {
            throw SystemException.forbidden(
                    "Tài khoản đối tác đang bị tạm đình chỉ, không thể xóa hồ sơ.",
                    "PROVIDER_SUSPENDED");
        }
        ProviderDocument doc =
                documents
                        .findByIdAndProviderId(documentId, provider.getId())
                        .orElseThrow(() -> SystemException.notFound("DOCUMENT_NOT_FOUND"));
        if (doc.getStatus() == ProviderDocumentStatus.APPROVED) {
            throw SystemException.conflict(
                    "Không thể xóa giấy tờ đã được phê duyệt.", "DOCUMENT_LOCKED");
        }
        documents.delete(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MarketplaceListingResponse> listMyListings(String username) {
        ProviderProfile provider = resolveProfile(username).orElse(null);
        if (provider == null) return List.of();
        return listings.findByProviderIdOrderByCreatedAtDesc(provider.getId()).stream()
                .filter(l -> !l.isDeleted())
                .map(mapper::toListingResponse)
                .toList();
    }

    @Override
    public MarketplaceListingResponse createListing(
            MarketplaceListingUpsertRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        if (provider.getVerificationStatus() == ProviderVerificationStatus.SUSPENDED) {
            throw SystemException.forbidden("Đối tác đang bị tạm đình chỉ.", "PROVIDER_SUSPENDED");
        }
        MarketplaceListing listing = new MarketplaceListing();
        listing.setProvider(provider);
        listing.setSlug(
                MarketplaceSlugOperations.uniqueSlug(
                        request.title(), "listing", listings::existsBySlug));
        applyListingFields(listing, request);
        listing.setModerationStatus(
                Boolean.TRUE.equals(request.submitForReview())
                        ? ListingModerationStatus.PENDING_REVIEW
                        : ListingModerationStatus.DRAFT);
        MarketplaceListing saved = listings.save(listing);
        return mapper.toListingResponse(saved);
    }

    @Override
    public MarketplaceListingResponse updateListing(
            Long listingId, MarketplaceListingUpsertRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        MarketplaceListing listing = requireOwnedListing(listingId, provider);
        applyListingFields(listing, request);
        if (Boolean.TRUE.equals(request.submitForReview())
                && listing.getModerationStatus() != ListingModerationStatus.PUBLISHED) {
            listing.setModerationStatus(ListingModerationStatus.PENDING_REVIEW);
        }
        return mapper.toListingResponse(listings.save(listing));
    }

    @Override
    public MarketplaceListingResponse toggleListingPause(Long listingId, String username) {
        ProviderProfile provider = requireMyProfile(username);
        MarketplaceListing listing = requireOwnedListing(listingId, provider);
        if (listing.getModerationStatus() == ListingModerationStatus.PUBLISHED) {
            listing.setModerationStatus(ListingModerationStatus.PAUSED);
        } else if (listing.getModerationStatus() == ListingModerationStatus.PAUSED) {
            if (provider.getVerificationStatus() != ProviderVerificationStatus.VERIFIED) {
                throw SystemException.conflict(
                        "Hồ sơ đối tác phải ở trạng thái Đã xác minh mới có thể mở lại tin đăng.",
                        "PROVIDER_NOT_VERIFIED");
            }
            listing.setModerationStatus(ListingModerationStatus.PUBLISHED);
        } else {
            throw SystemException.conflict(
                    "Chỉ tin đăng Đang hiển thị hoặc Tạm dừng mới đổi trạng thái được.",
                    "INVALID_LISTING_STATE");
        }
        return mapper.toListingResponse(listings.save(listing));
    }

    @Override
    @Transactional(readOnly = true)
    public ProviderFleetSummaryResponse getMyFleet(String username) {
        ProviderProfile provider = resolveProfile(username).orElse(null);
        if (provider == null) return new ProviderFleetSummaryResponse(List.of(), List.of());
        var myUavs =
                uavs.findByProviderIdOrderByIdDesc(provider.getId()).stream()
                        .filter(u -> u.getStatus() != UavStatus.INACTIVE)
                        .map(mapper::toUavResponse)
                        .toList();
        var myEquipment =
                equipmentRepository.findByProviderIdOrderByIdDesc(provider.getId()).stream()
                        .filter(e -> e.getStatus() != EquipmentStatus.INACTIVE)
                        .map(mapper::toEquipmentResponse)
                        .toList();
        return new ProviderFleetSummaryResponse(myUavs, myEquipment);
    }

    @Override
    public ProviderUavResponse registerProviderUav(
            ProviderUavCreateRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        String serial = request.serialNumber().trim();
        if (uavs.existsBySerialNumber(serial)) {
            throw SystemException.conflict("Số serial UAV đã tồn tại trên hệ thống.")
                    .at("serialNumber");
        }
        Uav uav = new Uav(request.model().trim(), serial, request.manufacturer().trim());
        uav.setProvider(provider);
        uav.setStatus(UavStatus.AVAILABLE);
        return mapper.toUavResponse(uavs.save(uav));
    }

    @Override
    public ProviderEquipmentResponse registerProviderEquipment(
            ProviderEquipmentCreateRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        String serial = trimOrNull(request.serialNumber());
        if (serial != null && equipmentRepository.existsBySerialNumber(serial)) {
            throw SystemException.conflict("Số serial thiết bị đã tồn tại.").at("serialNumber");
        }
        Equipment eq = new Equipment(request.name().trim(), request.type(), serial, null);
        eq.setProvider(provider);
        eq.setQuantity(request.quantity());
        eq.setAvailableQuantity(request.quantity());
        eq.setReservedQuantity(0);
        eq.setStatus(EquipmentStatus.ACTIVE);
        return mapper.toEquipmentResponse(equipmentRepository.save(eq));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionResponse> listMyOrders(String username) {
        ProviderProfile provider = resolveProfile(username).orElse(null);
        if (provider == null) return List.of();
        boolean isOwner = isFleetOwner(provider, username);
        return missions.findByProviderIdOrderByCreatedAtDesc(provider.getId()).stream()
                .filter(
                        m ->
                                isOwner
                                        || (m.getOperator() != null
                                                && username.equalsIgnoreCase(
                                                        m.getOperator().getUsername())))
                .map(missionMapper::toResponse)
                .toList();
    }

    @Override
    public MissionResponse respondToOrder(
            Long missionId, ProviderOrderActionRequest request, String username) {
        ProviderProfile provider = requireOwnedVerifiedProfile(username);
        Mission mission = requireFleetOrderForUpdate(missionId, provider, username, true);
        MarketplaceProviderOperations.validateRespondRequest(mission, request);

        MissionStatus previous = mission.getStatus();
        mission.setProviderResponseNote(request.effectiveNote());
        mission.setProviderRespondedAt(LocalDateTime.now());

        if (request.accept()) {
            if (request.uavId() != null) {
                Uav uav = resources.lockUav(request.uavId());
                MarketplaceProviderOperations.validateProviderUav(uav, provider);
                resources.requireUavFreeFor(uav, mission);
                mission.setUav(uav);
            }
            if (mission.getOperator() == null) {
                AppUser ownerOperator = resources.lockOperator(provider.getUser().getId());
                resources.requireOperatorFreeFor(ownerOperator, mission);
                mission.setOperator(ownerOperator);
            }
            mission.setOperatorAccepted(true);
            mission.setProviderResponseStatus(ProviderOrderStatus.ACCEPTED);
            mission.setStatus(
                    mission.getUav() != null ? MissionStatus.READY : MissionStatus.CONFIRMED);
            Mission saved = missions.save(mission);
            escrowService.issueOrSyncEscrowInvoiceForMission(saved.getId());
            missionEvents.save(
                    new MissionEvent(
                            saved,
                            MissionEventType.OPERATOR_ACCEPTED,
                            provider.getUser(),
                            previous,
                            saved.getStatus(),
                            "Đội bay đã xác nhận tiếp nhận đơn",
                            mission.getProviderResponseNote()));
            notifyUser(
                    saved.getCustomer(),
                    "Đơn " + saved.getCode() + " đã được xác nhận lịch bay",
                    "Đội bay đối tác đã xác nhận tiếp nhận đơn dịch vụ của bạn.",
                    com.uav.platform.enums.NotificationType.MISSION_STATUS_CHANGED,
                    "MISSION",
                    saved.getId());
            publishOrderUpdated(saved, OrderStatusGroups.SCHEDULED);
            return missionMapper.toResponse(saved);
        } else {
            // CONTRACT §1: Fleet declines -> return order to PENDING_DISPATCH queue for platform
            // re-dispatch.
            MarketplaceProviderOperations.resetDeclinedOrder(mission);
            Mission saved = missions.save(mission);
            missionEvents.save(
                    new MissionEvent(
                            saved,
                            MissionEventType.REJECTED,
                            provider.getUser(),
                            previous,
                            MissionStatus.PENDING_CONFIRMATION,
                            "Đội bay từ chối nhận đơn — chuyển lại hàng đợi điều phối nền tảng",
                            mission.getProviderResponseNote()));
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
    }

    @Override
    public MissionResponse startOrder(Long missionId, String username) {
        ProviderProfile provider = requireVerifiedProfile(username);
        Mission mission = requireFleetOrderForUpdate(missionId, provider, username, false);
        if (mission.getStatus() != MissionStatus.CONFIRMED
                && mission.getStatus() != MissionStatus.RESOURCE_RESERVED
                && mission.getStatus() != MissionStatus.READY) {
            throw SystemException.conflict(
                    "Đơn hàng phải được Xác nhận trước khi bắt đầu thực hiện.",
                    "ORDER_NOT_CONFIRM_READY");
        }
        if (SystemConfigurationOperations.boolOrDefault(
                        systemConfig, "marketplace.require_escrow_before_start", false)
                && mission.getQuotedSubtotalVnd() != null
                && mission.getQuotedSubtotalVnd().signum() > 0
                && !invoices.existsByMissionIdAndStatusIn(
                        mission.getId(), List.of(InvoiceStatus.PAID))) {
            throw SystemException.conflict(
                    "Khách hàng cần hoàn tất nạp tiền tạm giữ (Escrow) trước khi đối tác bắt đầu thực hiện đơn hàng.",
                    "ESCROW_FUNDING_REQUIRED");
        }
        Uav uav;
        if (mission.getUav() == null) {
            List<Uav> candidates =
                    uavs.findByProviderIdOrderByIdDesc(provider.getId()).stream()
                            .filter(u -> u.getStatus() == UavStatus.AVAILABLE)
                            .sorted(java.util.Comparator.comparing(Uav::getId))
                            .toList();
            Uav chosen = null;
            for (Uav candidate : candidates) {
                Uav locked = resources.lockUav(candidate.getId());
                if (locked.getStatus() == UavStatus.AVAILABLE
                        && resources.isUavFreeFor(locked, mission)
                        && !missions.existsByUavIdAndIdNotAndStatus(
                                locked.getId(), mission.getId(), MissionStatus.IN_PROGRESS)) {
                    chosen = locked;
                    break;
                }
            }
            if (chosen == null) {
                throw SystemException.conflict(
                        "Không còn thiết bị bay trống trong khung giờ này.", "NO_UAV_AVAILABLE");
            }
            uav = chosen;
            mission.setUav(uav);
        } else {
            uav = resources.lockUav(mission.getUav().getId());
            if (missions.existsByUavIdAndIdNotAndStatus(
                    uav.getId(), mission.getId(), MissionStatus.IN_PROGRESS)) {
                throw SystemException.conflict(
                        "Thiết bị bay hiện đang thực hiện một chuyến bay khác.", "UAV_IN_USE");
            }
        }
        uav.setStatus(UavStatus.IN_USE);
        uavs.save(uav);
        mission.setUav(uav);
        if (pilots != null && mission.getOperator() != null) {
            for (var p : pilots.findByPilotUserIdAndDeletedFalse(mission.getOperator().getId())) {
                p.setPilotStatus(com.uav.platform.enums.ProviderPilotStatus.IN_FLIGHT);
                pilots.save(p);
            }
        }
        MissionStatus previous = mission.getStatus();
        mission.setStatus(MissionStatus.IN_PROGRESS);
        Mission saved = missions.save(mission);

        if (simulationService != null) {
            try {
                simulationService.rehearseMission(saved.getId(), 3.2, 115.0, 2.5, username);
            } catch (RuntimeException ignored) {
                // Simulation session is best-effort when no fleet UAV exists in focused tests.
            }
        }

        missionEvents.save(
                new MissionEvent(
                        saved,
                        MissionEventType.STATUS_CHANGED,
                        provider.getUser(),
                        previous,
                        MissionStatus.IN_PROGRESS,
                        "Đội bay bắt đầu triển khai chuyến bay (mô phỏng)",
                        null));
        notifyUser(
                saved.getCustomer(),
                "Đơn " + saved.getCode() + " đang bay",
                "Chuyến bay của đơn hàng đã khởi hành — bạn có thể theo dõi trực tiếp trên bản đồ.",
                com.uav.platform.enums.NotificationType.MISSION_STATUS_CHANGED,
                "MISSION",
                saved.getId());
        publishOrderUpdated(saved, OrderStatusGroups.IN_FLIGHT);
        return missionMapper.toResponse(saved);
    }

    @Override
    public MissionResponse completeOrder(
            Long missionId, ProviderOrderCompleteRequest request, String username) {
        ProviderProfile provider = requireVerifiedProfile(username);
        Mission mission = requireFleetOrderForUpdate(missionId, provider, username, false);
        MarketplaceProviderOperations.validateCompleteOrder(mission, request);
        if (mission.getUav() != null) {
            Uav uav = mission.getUav();
            if (simulationService != null) {
                try {
                    simulationService.stop(uav.getId(), username);
                } catch (RuntimeException ignored) {
                    // Ignore if simulation already finished.
                }
            }
            if (uav.getStatus() == UavStatus.IN_USE) {
                uav.setStatus(UavStatus.AVAILABLE);
                uavs.save(uav);
            }
        }
        if (pilots != null && mission.getOperator() != null) {
            for (var p : pilots.findByPilotUserIdAndDeletedFalse(mission.getOperator().getId())) {
                p.setPilotStatus(com.uav.platform.enums.ProviderPilotStatus.AVAILABLE);
                pilots.save(p);
            }
        }
        MissionStatus previous = mission.getStatus();
        mission.setStatus(MissionStatus.COMPLETED);
        mission.setCompletedAt(LocalDateTime.now());
        mission.setCompletionNote(request.completionNote().trim());
        mission.setEquipmentCondition(trimOrNull(request.equipmentCondition()));
        Mission saved = missions.save(mission);

        provider.setCompletedMissionsCount(provider.getCompletedMissionsCount() + 1);
        providers.save(provider);
        escrowService.issueOrSyncEscrowInvoiceForMission(saved.getId());

        missionEvents.save(
                new MissionEvent(
                        saved,
                        MissionEventType.COMPLETED,
                        provider.getUser(),
                        previous,
                        MissionStatus.COMPLETED,
                        "Đội bay hoàn tất và bàn giao kết quả",
                        saved.getCompletionNote()));
        notifyUser(
                saved.getCustomer(),
                "Đã bàn giao kết quả " + saved.getCode(),
                "Đơn hàng đã hoàn tất bàn giao. Vui lòng kiểm tra dữ liệu và đánh giá dịch vụ.",
                com.uav.platform.enums.NotificationType.MISSION_STATUS_CHANGED,
                "MISSION",
                saved.getId());
        publishOrderUpdated(saved, OrderStatusGroups.TO_REVIEW);
        return missionMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionResponse> listOpenRfqs(String username) {
        AppUser actor = requireUser(username);
        if (!SystemConfigurationOperations.boolOrDefault(
                systemConfig, "marketplace.rfq_enabled", false)) {
            return List.of();
        }
        return missions.findOpenRfqMissions(OPEN_RFQ_STATUSES).stream()
                .filter(
                        m ->
                                m.getCustomer() == null
                                        || !Objects.equals(m.getCustomer().getId(), actor.getId()))
                .map(missionMapper::toResponse)
                .toList();
    }

    @Override
    public MissionBidResponse submitRfqBid(
            Long missionId, MissionBidCreateRequest request, String username) {
        if (!SystemConfigurationOperations.boolOrDefault(
                systemConfig, "marketplace.rfq_enabled", false)) {
            throw SystemException.conflict(
                    "Tính năng đấu thầu báo giá mở (RFQ) hiện đang tạm đóng theo cấu hình hệ thống.",
                    "RFQ_DISABLED");
        }
        ProviderProfile provider = requireVerifiedProfile(username);
        Mission mission =
                missions.findByIdForUpdate(missionId)
                        .orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
        MarketplaceProviderOperations.validateOpenRfqForBid(mission, provider, OPEN_RFQ_STATUSES);
        MissionBid bid =
                bids.findByMissionIdAndProviderId(missionId, provider.getId())
                        .orElseGet(
                                () -> {
                                    MissionBid created = new MissionBid();
                                    created.setMission(mission);
                                    created.setProvider(provider);
                                    return created;
                                });
        MarketplaceProviderOperations.applyBidFields(bid, request);
        MissionBid savedBid = bids.save(bid);
        notifyUser(
                mission.getCustomer(),
                "Báo giá mới cho " + mission.getCode(),
                provider.getDisplayName() + " vừa gửi báo giá cạnh tranh.",
                com.uav.platform.enums.NotificationType.MISSION_STATUS_CHANGED,
                "MISSION",
                mission.getId());
        return mapper.toBidResponse(savedBid);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionBidResponse> listMyBids(String username) {
        ProviderProfile provider = providers.findByUserUsername(username).orElse(null);
        if (provider == null) return List.of();
        return bids.findByProviderIdOrderByCreatedAtDesc(provider.getId()).stream()
                .map(mapper::toBidResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionBidResponse> listBidsForMission(
            Long missionId, Authentication authentication) {
        Mission mission = missionAccess.accessible(missionId, authentication);
        return bids.findByMissionIdOrderByProposedPriceVndAscCreatedAtAsc(mission.getId()).stream()
                .map(mapper::toBidResponse)
                .toList();
    }

    @Override
    public MissionResponse acceptMissionBid(
            Long missionId, Long bidId, Authentication authentication) {
        Mission mission = missionAccess.accessibleForUpdate(missionId, authentication);
        String actorUsername = authentication == null ? null : authentication.getName();
        MarketplaceProviderOperations.validateRfqOpenForAcceptance(
                mission,
                actorUsername,
                missionAccess.hasAuthority(authentication, "USER_MANAGE"),
                OPEN_RFQ_STATUSES);
        MissionBid winning =
                bids.findById(bidId)
                        .filter(b -> Objects.equals(b.getMission().getId(), missionId))
                        .orElseThrow(() -> SystemException.notFound("BID_NOT_FOUND"));
        MarketplaceProviderOperations.validateWinningBid(winning);

        LocalDateTime now = LocalDateTime.now();
        for (MissionBid candidate :
                bids.findByMissionIdOrderByProposedPriceVndAscCreatedAtAsc(missionId)) {
            if (Objects.equals(candidate.getId(), winning.getId())) {
                candidate.setStatus(MissionBidStatus.ACCEPTED);
                candidate.setRespondedAt(now);
            } else if (candidate.getStatus() == MissionBidStatus.PENDING) {
                candidate.setStatus(MissionBidStatus.REJECTED);
                candidate.setRespondedAt(now);
            }
            bids.save(candidate);
        }

        MissionStatus previous = mission.getStatus();
        ProviderProfile provider = winning.getProvider();
        MarketplaceProviderOperations.applyAcceptedBid(mission, winning, now);
        Mission saved = missions.save(mission);

        escrowService.issueOrSyncEscrowInvoiceForMission(saved.getId());
        missionEvents.save(
                new MissionEvent(
                        saved,
                        MissionEventType.OPERATOR_ACCEPTED,
                        mission.getCustomer(),
                        previous,
                        MissionStatus.CONFIRMED,
                        "Khách hàng chốt báo giá của đối tác " + provider.getDisplayName(),
                        null));
        notifyUser(
                provider.getUser(),
                "Trúng thầu " + saved.getCode(),
                "Khách hàng đã chọn báo giá của bạn cho nhiệm vụ " + saved.getTitle() + ".",
                com.uav.platform.enums.NotificationType.MISSION_ASSIGNED,
                "MISSION",
                saved.getId());
        return missionMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ProviderWalletResponse getMyWallet(String username) {
        ProviderProfile provider = requireMyProfile(username);
        ProviderWallet wallet =
                wallets.findByProviderId(provider.getId())
                        .orElseGet(
                                () -> {
                                    ProviderWallet empty = new ProviderWallet();
                                    empty.setProvider(provider);
                                    return empty;
                                });
        List<WalletTransaction> txs =
                wallet.getId() == null
                        ? List.of()
                        : ledger.findTop50ByWalletIdOrderByCreatedAtDescIdDesc(wallet.getId());
        var myPayouts =
                payouts.findByProviderIdOrderByCreatedAtDesc(provider.getId()).stream()
                        .map(mapper::toPayoutResponse)
                        .toList();
        return MarketplaceProviderOperations.buildWalletResponse(
                provider,
                wallet,
                escrowService.effectivePlatformFeeRate(provider.getId()),
                txs.stream().map(mapper::toWalletTransactionResponse).toList(),
                myPayouts);
    }

    @Override
    public ProviderPayoutResponse requestPayout(PayoutCreateRequest request, String username) {
        ProviderProfile provider = requireVerifiedProfile(username);
        MarketplaceProviderOperations.requireBankInfo(provider);
        if (wallets.findByProviderId(provider.getId()).isEmpty()) {
            ProviderWallet created = new ProviderWallet();
            created.setProvider(provider);
            wallets.saveAndFlush(created);
        }
        ProviderWallet wallet = wallets.findByProviderIdForUpdate(provider.getId()).orElseThrow();
        BigDecimal minPayout =
                BigDecimal.valueOf(
                        SystemConfigurationOperations.longOrDefault(
                                systemConfig, "marketplace.min_payout_vnd", 100_000L));
        BigDecimal maxPayout =
                BigDecimal.valueOf(
                        SystemConfigurationOperations.longOrDefault(
                                systemConfig, "marketplace.max_payout_vnd", 500_000_000L));
        BigDecimal amount =
                MarketplaceProviderOperations.validatePayoutAmount(
                        wallet, request, minPayout, maxPayout);

        wallet.setAvailableBalanceVnd(wallet.getAvailableBalanceVnd().subtract(amount));
        wallet.setPendingPayoutVnd(wallet.getPendingPayoutVnd().add(amount));
        wallets.save(wallet);

        ProviderPayout saved =
                payouts.save(
                        MarketplaceProviderOperations.buildPayout(
                                provider, amount, request.providerNote()));
        ledger.save(MarketplaceProviderOperations.buildPayoutLedgerTx(wallet, saved, amount));
        return mapper.toPayoutResponse(saved);
    }

    private void applyListingFields(
            MarketplaceListing listing, MarketplaceListingUpsertRequest request) {
        if (request.categoryServiceId() != null) {
            ServiceOffering cat =
                    serviceOfferings
                            .findById(request.categoryServiceId())
                            .orElseThrow(
                                    () ->
                                            SystemException.notFound("SERVICE_NOT_FOUND")
                                                    .at("categoryServiceId"));
            listing.setCategoryService(cat);
        } else {
            listing.setCategoryService(null);
        }
        int defaultRadius =
                SystemConfigurationOperations.intOrDefault(
                        systemConfig, "marketplace.default_service_radius_km", 100);
        MarketplaceProviderOperations.applyListingCoreFields(listing, request, defaultRadius);
    }

    private MarketplaceListing requireOwnedListing(Long listingId, ProviderProfile provider) {
        return listings.findWithDetailsById(listingId)
                .filter(l -> !l.isDeleted())
                .filter(
                        l ->
                                l.getProvider() != null
                                        && Objects.equals(
                                                l.getProvider().getId(), provider.getId()))
                .orElseThrow(() -> SystemException.notFound("LISTING_NOT_FOUND"));
    }

    private Optional<ProviderProfile> resolveProfile(String username) {
        Optional<ProviderProfile> owned = providers.findByUserUsername(username);
        if (owned.isPresent() || pilots == null) {
            return owned;
        }
        return users.findByUsername(username)
                .flatMap(
                        u ->
                                pilots.findByPilotUserIdAndDeletedFalse(u.getId()).stream()
                                        .map(com.uav.platform.entity.ProviderPilot::getProvider)
                                        .filter(Objects::nonNull)
                                        .findFirst());
    }

    private ProviderProfile requireMyProfile(String username) {
        return resolveProfile(username)
                .orElseThrow(
                        () ->
                                SystemException.conflict(
                                        "Vui lòng khởi tạo Hồ sơ Đối tác trước khi thực hiện thao tác này.",
                                        "PROVIDER_PROFILE_REQUIRED"));
    }

    private boolean isFleetOwner(ProviderProfile provider, String username) {
        return MarketplaceProviderOperations.isFleetOwner(provider, username);
    }

    private ProviderProfile requireOwnedProfile(String username) {
        ProviderProfile profile = requireMyProfile(username);
        if (!isFleetOwner(profile, username)) {
            throw SystemException.forbidden(
                    "Chỉ chủ đội bay mới có quyền thực hiện thao tác quản trị đội bay này.",
                    "FLEET_OWNER_REQUIRED");
        }
        return profile;
    }

    private ProviderProfile requireOwnedVerifiedProfile(String username) {
        ProviderProfile profile = requireVerifiedProfile(username);
        if (!isFleetOwner(profile, username)) {
            throw SystemException.forbidden(
                    "Chỉ chủ đội bay mới có quyền thực hiện thao tác quản trị đội bay này.",
                    "FLEET_OWNER_REQUIRED");
        }
        return profile;
    }

    private Mission requireFleetOrderForUpdate(
            Long missionId, ProviderProfile provider, String username, boolean ownerOnly) {
        Mission mission =
                missions.findByIdForUpdate(missionId)
                        .orElseThrow(() -> SystemException.notFound("ORDER_NOT_FOUND"));
        if (mission.getProvider() == null
                || !Objects.equals(mission.getProvider().getId(), provider.getId())) {
            throw SystemException.forbidden(
                    "Bạn không có quyền thao tác trên đơn hàng thuộc đội bay khác.",
                    "ORDER_ACCESS_DENIED");
        }
        if (!isFleetOwner(provider, username)) {
            if (ownerOnly
                    || mission.getOperator() == null
                    || !username.equalsIgnoreCase(mission.getOperator().getUsername())) {
                throw SystemException.forbidden(
                        "Kỹ sư chỉ được thao tác trên đơn hàng được phân công cho chính mình.",
                        "PILOT_ORDER_ACCESS_DENIED");
            }
        }
        return mission;
    }

    private ProviderProfile requireVerifiedProfile(String username) {
        ProviderProfile profile = requireMyProfile(username);
        if (profile.getVerificationStatus() != ProviderVerificationStatus.VERIFIED) {
            throw SystemException.forbidden(
                    "Hồ sơ Đối tác cần được Quản trị viên xác minh (VERIFIED) để thực hiện nghiệp vụ này.",
                    "PROVIDER_NOT_VERIFIED");
        }
        return profile;
    }

    private AppUser requireUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> SystemException.unauthorized("USER_NOT_FOUND"));
    }

    private static String validateOptionalHttpUrl(String raw, String field) {
        return MarketplaceProviderOperations.validateOptionalHttpUrl(raw, field);
    }

    private static String trimOrNull(String value) {
        return MarketplaceProviderOperations.trimOrNull(value);
    }
}
