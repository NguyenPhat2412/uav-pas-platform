package com.uav.platform.service.impl.marketplace.provider;

import com.uav.platform.common.util.OrderStatusGroups;
import com.uav.platform.dto.request.marketplace.catalog.MissionBidCreateRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.MarketplaceListingUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderDocumentCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderEquipmentCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOnboardingRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderActionRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderCompleteRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavCreateRequest;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.catalog.MissionBidResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderPayoutResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderWalletResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderDocumentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderEquipmentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderFleetSummaryResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderUavResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.marketplace.MissionBid;
import com.uav.platform.entity.marketplace.ProviderDocument;
import com.uav.platform.entity.marketplace.ProviderPayout;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.entity.marketplace.ProviderWallet;
import com.uav.platform.entity.marketplace.WalletTransaction;
import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.inventory.EquipmentStatus;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.MissionBidStatus;
import com.uav.platform.enums.marketplace.PayoutStatus;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderDocumentStatus;
import com.uav.platform.enums.marketplace.ProviderOrderStatus;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.marketplace.WalletTransactionType;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.marketplace.provider.MarketplaceMapper;
import com.uav.platform.mapper.mission.lifecycle.MissionMapper;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.marketplace.MarketplaceListingRepository;
import com.uav.platform.repository.marketplace.MissionBidRepository;
import com.uav.platform.repository.marketplace.ProviderDocumentRepository;
import com.uav.platform.repository.marketplace.ProviderPayoutRepository;
import com.uav.platform.repository.marketplace.ProviderProfileRepository;
import com.uav.platform.repository.marketplace.ProviderWalletRepository;
import com.uav.platform.repository.marketplace.WalletTransactionRepository;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.settings.SystemConfigurationOperations;
import com.uav.platform.service.marketplace.escrow.MarketplaceEscrowService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderService;
import com.uav.platform.service.mission.lifecycle.MissionAccessService;
import com.uav.platform.service.settings.SystemConfigService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MarketplaceProviderServiceImpl implements MarketplaceProviderService {

    private static final Set<MissionStatus> OPEN_RFQ_STATUSES =
            Set.of(MissionStatus.DRAFT, MissionStatus.PENDING_CONFIRMATION);

    private final UserRepository users;
    private final ProviderProfileRepository providers;
    private final ProviderDocumentRepository documents;
    private final MarketplaceListingRepository listings;
    private final ProviderWalletRepository wallets;
    private final ProviderPayoutRepository payouts;
    private final WalletTransactionRepository ledger;
    private final MissionBidRepository bids;
    private final ServiceOfferingRepository serviceOfferings;
    private final MediaAssetRepository mediaAssets;
    private final UavRepository uavs;
    private final EquipmentRepository equipmentRepository;
    private final MissionRepository missions;
    private final MissionEventRepository missionEvents;
    private final InvoiceRepository invoices;
    private final MissionAccessService missionAccess;
    private final MarketplaceEscrowService escrowService;
    private final SystemConfigService systemConfig;
    private final AuditLogService audit;
    private final MarketplaceMapper mapper;
    private final MissionMapper missionMapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.beans.factory.ObjectProvider<
                    com.uav.platform.service.notification.inbox.NotificationService>
            notifications;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.uav.platform.repository.marketplace.ProviderPilotRepository pilots;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.uav.platform.service.simulation.SimulationService simulationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.uav.platform.transport.websocket.RealtimeEventBroadcaster realtime;

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
            com.uav.platform.enums.notification.NotificationType type,
            String refType,
            Long refId) {
        if (target == null || target.getId() == null || notifications == null) return;
        var svc = notifications.getIfAvailable();
        if (svc == null) return;
        try {
            svc.sendNotification(
                    new com.uav.platform.dto.request.notification.inbox.CreateNotificationRequest(
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
        profile.setDisplayName(request.displayName().trim());
        profile.setProviderType(request.providerType());
        profile.setTaxOrIdNumber(trimOrNull(request.taxOrIdNumber()));
        profile.setFlightLicenseNumber(trimOrNull(request.flightLicenseNumber()));
        profile.setBio(trimOrNull(request.bio()));
        profile.setProvince(request.province().trim());
        int defaultRadius =
                SystemConfigurationOperations.intOrDefault(
                        systemConfig, "marketplace.default_service_radius_km", 100);
        profile.setServiceRadiusKm(
                request.serviceRadiusKm() != null ? request.serviceRadiusKm() : defaultRadius);
        profile.setContactPhone(trimOrNull(request.contactPhone()));
        profile.setBankName(trimOrNull(request.bankName()));
        profile.setBankAccountNumber(trimOrNull(request.bankAccountNumber()));
        profile.setBankAccountHolder(trimOrNull(request.bankAccountHolder()));

        if (Boolean.TRUE.equals(request.submitForReview())
                && profile.getVerificationStatus() != ProviderVerificationStatus.VERIFIED) {
            profile.setVerificationStatus(ProviderVerificationStatus.PENDING_REVIEW);
        }

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
    public ProviderDocumentResponse addDocument(
            ProviderDocumentCreateRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
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
        ProviderProfile provider = requireMyProfile(username);
        ProviderDocument doc =
                documents
                        .findById(documentId)
                        .filter(d -> Objects.equals(d.getProvider().getId(), provider.getId()))
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
        if (request == null || request.accept() == null) {
            throw SystemException.badRequest(
                            "Vui lòng xác nhận chấp nhận hoặc từ chối đơn.", "VALIDATION_ERROR")
                    .at("accept");
        }

        if (mission.getStatus() == MissionStatus.COMPLETED
                || mission.getStatus() == MissionStatus.CANCELLED
                || mission.getStatus() == MissionStatus.REJECTED) {
            throw SystemException.conflict(
                    "Đơn hàng đã kết thúc, không thể phản hồi lại.", "ORDER_ALREADY_CLOSED");
        }

        MissionStatus previous = mission.getStatus();
        mission.setProviderResponseNote(request.effectiveNote());
        mission.setProviderRespondedAt(LocalDateTime.now());

        if (request.accept()) {
            if (request.uavId() != null) {
                Uav uav =
                        uavs.findById(request.uavId())
                                .filter(
                                        u ->
                                                u.getProvider() != null
                                                        && Objects.equals(
                                                                u.getProvider().getId(),
                                                                provider.getId()))
                                .orElseThrow(
                                        () ->
                                                SystemException.forbidden(
                                                        "Chỉ được gán UAV thuộc quyền sở hữu của đối tác.",
                                                        "PROVIDER_UAV_MISMATCH"));
                mission.setUav(uav);
            }
            if (mission.getOperator() == null) {
                mission.setOperator(provider.getUser());
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
                    com.uav.platform.enums.notification.NotificationType.MISSION_STATUS_CHANGED,
                    "MISSION",
                    saved.getId());
            publishOrderUpdated(saved, OrderStatusGroups.SCHEDULED);
            return missionMapper.toResponse(saved);
        } else {
            // CONTRACT §1: Fleet declines -> return order to PENDING_DISPATCH queue for platform
            // re-dispatch.
            mission.setProvider(null);
            mission.setUav(null);
            mission.setOperator(null);
            mission.setOperatorAccepted(false);
            mission.setProviderResponseStatus(ProviderOrderStatus.PENDING_DISPATCH);
            mission.setStatus(MissionStatus.PENDING_CONFIRMATION);
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
        if (mission.getUav() == null) {
            uavs.findByProviderIdOrderByIdDesc(provider.getId()).stream()
                    .filter(u -> u.getStatus() == UavStatus.AVAILABLE)
                    .findFirst()
                    .ifPresent(mission::setUav);
        }
        if (mission.getUav() != null) {
            Uav uav = mission.getUav();
            uav.setStatus(UavStatus.IN_USE);
            uavs.save(uav);
        }
        if (pilots != null && mission.getOperator() != null) {
            for (var p : pilots.findByPilotUserIdAndDeletedFalse(mission.getOperator().getId())) {
                p.setPilotStatus(com.uav.platform.enums.marketplace.ProviderPilotStatus.IN_FLIGHT);
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
                com.uav.platform.enums.notification.NotificationType.MISSION_STATUS_CHANGED,
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
        if (request == null
                || request.completionNote() == null
                || request.completionNote().isBlank()) {
            throw SystemException.badRequest(
                            "Nhập biên bản kết quả bàn giao cho khách hàng.", "VALIDATION_ERROR")
                    .at("completionNote");
        }
        if (mission.getStatus() != MissionStatus.IN_PROGRESS
                && mission.getStatus() != MissionStatus.READY
                && mission.getStatus() != MissionStatus.CONFIRMED) {
            throw SystemException.conflict(
                    "Trạng thái đơn hiện tại không thể hoàn thành bàn giao.",
                    "ORDER_CANNOT_COMPLETE");
        }
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
                p.setPilotStatus(com.uav.platform.enums.marketplace.ProviderPilotStatus.AVAILABLE);
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
                com.uav.platform.enums.notification.NotificationType.MISSION_STATUS_CHANGED,
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
                systemConfig, "marketplace.rfq_enabled", true)) {
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
                systemConfig, "marketplace.rfq_enabled", true)) {
            throw SystemException.conflict(
                    "Tính năng đấu thầu báo giá mở (RFQ) hiện đang tạm đóng theo cấu hình hệ thống.",
                    "RFQ_DISABLED");
        }
        ProviderProfile provider = requireVerifiedProfile(username);
        Mission mission =
                missions.findByIdForUpdate(missionId)
                        .orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
        if (mission.getProviderResponseStatus() != ProviderOrderStatus.OPEN_RFQ
                || !OPEN_RFQ_STATUSES.contains(mission.getStatus())) {
            throw SystemException.conflict(
                    "Yêu cầu này không còn mở nhận chào thầu.", "RFQ_CLOSED");
        }
        if (mission.getCustomer() != null
                && Objects.equals(mission.getCustomer().getId(), provider.getUser().getId())) {
            throw SystemException.conflict(
                    "Không thể tự báo giá cho yêu cầu của chính mình.", "SELF_BID_FORBIDDEN");
        }
        MissionBid bid =
                bids.findByMissionIdAndProviderId(missionId, provider.getId())
                        .orElseGet(
                                () -> {
                                    MissionBid created = new MissionBid();
                                    created.setMission(mission);
                                    created.setProvider(provider);
                                    return created;
                                });
        if (bid.getId() != null && bid.getStatus() == MissionBidStatus.ACCEPTED) {
            throw SystemException.conflict(
                    "Báo giá đã được khách hàng chốt, không thể chỉnh sửa.",
                    "BID_ALREADY_ACCEPTED");
        }
        bid.setProposedPriceVnd(request.proposedPriceVnd().setScale(0, RoundingMode.HALF_UP));
        bid.setEstimatedDeliveryHours(request.estimatedDeliveryHours());
        bid.setProposalNote(request.proposalNote().trim());
        bid.setProposedUavModel(trimOrNull(request.proposedUavModel()));
        bid.setStatus(MissionBidStatus.PENDING);
        MissionBid savedBid = bids.save(bid);
        notifyUser(
                mission.getCustomer(),
                "Báo giá mới cho " + mission.getCode(),
                provider.getDisplayName() + " vừa gửi báo giá cạnh tranh.",
                com.uav.platform.enums.notification.NotificationType.MISSION_STATUS_CHANGED,
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
        boolean isCustomerOwner =
                mission.getCustomer() != null
                        && Objects.equals(mission.getCustomer().getUsername(), actorUsername);
        if (!isCustomerOwner && !missionAccess.hasAuthority(authentication, "USER_MANAGE")) {
            throw new AccessDeniedException("Chỉ chủ nhiệm vụ mới được chọn nhà thầu.");
        }
        if (mission.getProviderResponseStatus() != ProviderOrderStatus.OPEN_RFQ
                || !OPEN_RFQ_STATUSES.contains(mission.getStatus())) {
            throw SystemException.conflict(
                    "Yêu cầu báo giá đã đóng hoặc đã chọn nhà thầu.", "RFQ_CLOSED");
        }
        MissionBid winning =
                bids.findById(bidId)
                        .filter(b -> Objects.equals(b.getMission().getId(), missionId))
                        .orElseThrow(() -> SystemException.notFound("BID_NOT_FOUND"));
        if (winning.getStatus() != MissionBidStatus.PENDING) {
            throw SystemException.conflict("Báo giá này không còn hiệu lực.", "BID_NOT_PENDING");
        }
        if (winning.getProvider() == null
                || winning.getProvider().getVerificationStatus()
                        != ProviderVerificationStatus.VERIFIED) {
            throw SystemException.conflict(
                    "Đối tác chào thầu hiện không còn trạng thái xác minh hợp lệ để nhận nhiệm vụ.",
                    "PROVIDER_NOT_VERIFIED");
        }

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
        mission.setProvider(provider);
        mission.setOperator(provider.getUser());
        mission.setOperatorAccepted(true);
        mission.setPricingModelSnapshot(PricingModel.PER_PACKAGE);
        mission.setUnitPriceSnapshotVnd(winning.getProposedPriceVnd());
        mission.setBookingUnits(BigDecimal.ONE);
        mission.setQuotedSubtotalVnd(winning.getProposedPriceVnd());
        mission.setProviderResponseStatus(ProviderOrderStatus.ACCEPTED);
        mission.setProviderRespondedAt(now);
        mission.setProviderResponseNote("Trúng thầu báo giá RFQ #" + winning.getId());
        mission.setStatus(MissionStatus.CONFIRMED);
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
                com.uav.platform.enums.notification.NotificationType.MISSION_ASSIGNED,
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
        return new ProviderWalletResponse(
                provider.getId(),
                provider.getDisplayName(),
                escrowService.effectivePlatformFeeRate(provider.getId()),
                wallet.getEscrowHeldVnd(),
                wallet.getAvailableBalanceVnd(),
                wallet.getPendingPayoutVnd(),
                wallet.getTotalEarnedVnd(),
                wallet.getTotalWithdrawnVnd(),
                provider.getBankName(),
                provider.getBankAccountNumber(),
                provider.getBankAccountHolder(),
                txs.stream().map(mapper::toWalletTransactionResponse).toList(),
                myPayouts);
    }

    @Override
    public ProviderPayoutResponse requestPayout(PayoutCreateRequest request, String username) {
        ProviderProfile provider = requireVerifiedProfile(username);
        if (provider.getBankName() == null
                || provider.getBankName().isBlank()
                || provider.getBankAccountNumber() == null
                || provider.getBankAccountNumber().isBlank()
                || provider.getBankAccountHolder() == null
                || provider.getBankAccountHolder().isBlank()) {
            throw SystemException.badRequest(
                    "Vui lòng cập nhật đầy đủ thông tin tài khoản ngân hàng trong Hồ sơ Đối tác trước khi rút tiền.",
                    "BANK_INFO_REQUIRED");
        }
        if (wallets.findByProviderId(provider.getId()).isEmpty()) {
            ProviderWallet created = new ProviderWallet();
            created.setProvider(provider);
            wallets.saveAndFlush(created);
        }
        ProviderWallet wallet = wallets.findByProviderIdForUpdate(provider.getId()).orElseThrow();
        BigDecimal amount = request.amountVnd().setScale(0, RoundingMode.HALF_UP);
        BigDecimal minPayout =
                BigDecimal.valueOf(
                        SystemConfigurationOperations.longOrDefault(
                                systemConfig, "marketplace.min_payout_vnd", 100_000L));
        BigDecimal maxPayout =
                BigDecimal.valueOf(
                        SystemConfigurationOperations.longOrDefault(
                                systemConfig, "marketplace.max_payout_vnd", 500_000_000L));
        if (amount.compareTo(minPayout) < 0) {
            throw SystemException.badRequest(
                            "Số tiền rút tối thiểu theo cấu hình hệ thống là "
                                    + minPayout.toPlainString()
                                    + " VNĐ.",
                            "PAYOUT_BELOW_MINIMUM")
                    .at("amountVnd");
        }
        if (amount.compareTo(maxPayout) > 0) {
            throw SystemException.badRequest(
                            "Số tiền rút tối đa mỗi lệnh là " + maxPayout.toPlainString() + " VNĐ.",
                            "PAYOUT_EXCEEDS_MAXIMUM")
                    .at("amountVnd");
        }
        if (wallet.getAvailableBalanceVnd().compareTo(amount) < 0) {
            throw SystemException.conflict(
                            "Số dư khả dụng không đủ để thực hiện lệnh rút tiền.",
                            "INSUFFICIENT_WALLET_BALANCE")
                    .at("amountVnd");
        }

        wallet.setAvailableBalanceVnd(wallet.getAvailableBalanceVnd().subtract(amount));
        wallet.setPendingPayoutVnd(wallet.getPendingPayoutVnd().add(amount));
        wallets.save(wallet);

        ProviderPayout payout = new ProviderPayout();
        payout.setCode(
                "PO-"
                        + provider.getId()
                        + "-"
                        + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        payout.setProvider(provider);
        payout.setAmountVnd(amount);
        payout.setBankName(provider.getBankName());
        payout.setBankAccountNumber(provider.getBankAccountNumber());
        payout.setBankAccountHolder(provider.getBankAccountHolder());
        payout.setStatus(PayoutStatus.PENDING);
        payout.setProviderNote(trimOrNull(request.providerNote()));
        ProviderPayout saved = payouts.save(payout);

        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setPayout(saved);
        tx.setTransactionType(WalletTransactionType.PAYOUT_REQUEST);
        tx.setGrossAmountVnd(amount);
        tx.setFeeAmountVnd(BigDecimal.ZERO);
        tx.setNetAmountVnd(amount.negate());
        tx.setBalanceAfterVnd(wallet.getAvailableBalanceVnd());
        tx.setDescription("Yêu cầu rút tiền " + saved.getCode() + " về " + saved.getBankName());
        ledger.save(tx);

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
        listing.setTitle(request.title().trim());
        listing.setSummary(trimOrNull(request.summary()));
        listing.setDescription(trimOrNull(request.description()));
        listing.setListingType(request.listingType());
        listing.setMissionType(request.missionType());
        listing.setPricingModel(request.pricingModel());
        listing.setBasePriceVnd(request.basePriceVnd().setScale(0, RoundingMode.HALF_UP));
        listing.setMinBookingUnits(
                request.minBookingUnits() != null ? request.minBookingUnits() : BigDecimal.ONE);
        listing.setSecurityDepositVnd(
                request.securityDepositVnd() != null
                        ? request.securityDepositVnd().setScale(0, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO);
        listing.setProvince(request.province().trim());
        int defaultRadius =
                SystemConfigurationOperations.intOrDefault(
                        systemConfig, "marketplace.default_service_radius_km", 100);
        listing.setServiceRadiusKm(
                request.serviceRadiusKm() != null ? request.serviceRadiusKm() : defaultRadius);
        listing.setEquipmentSpecs(trimOrNull(request.equipmentSpecs()));
        listing.setDeliverablesSummary(trimOrNull(request.deliverablesSummary()));
        listing.setCoverImageUrl(validateOptionalHttpUrl(request.coverImageUrl(), "coverImageUrl"));
        listing.setOnSiteSlaHours(request.onSiteSlaHours());
        listing.setDeliverySlaHours(request.deliverySlaHours());
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
                                        .map(
                                                com.uav.platform.entity.marketplace.ProviderPilot
                                                        ::getProvider)
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
        return provider != null
                && provider.getUser() != null
                && username != null
                && username.equalsIgnoreCase(provider.getUser().getUsername());
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
        String trimmed = trimOrNull(raw);
        if (trimmed == null) return null;
        try {
            URI uri = new URI(trimmed);
            String scheme = uri.getScheme();
            if (scheme == null
                    || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))
                    || uri.getHost() == null
                    || uri.getHost().isBlank()) {
                throw new IllegalArgumentException();
            }
            return trimmed;
        } catch (Exception ex) {
            throw SystemException.badRequest(
                            "Địa chỉ liên kết phải bắt đầu bằng https:// hoặc http:// hợp lệ.",
                            "INVALID_EXTERNAL_URL")
                    .at(field);
        }
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
