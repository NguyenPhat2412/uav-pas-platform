package com.uav.platform.service.impl.marketplace.provider;

import com.uav.platform.common.util.OrderStatusGroups;
import com.uav.platform.common.util.SecureTokens;
import com.uav.platform.dto.request.marketplace.provider.CreateListingFromTemplateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderAssignRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotPatchRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavUpdateRequest;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderDocumentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderPilotResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderUavResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.marketplace.ProviderPilot;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.inventory.EquipmentStatus;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderOrderStatus;
import com.uav.platform.enums.marketplace.ProviderPilotStatus;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.marketplace.provider.MarketplaceMapper;
import com.uav.platform.mapper.mission.lifecycle.MissionMapper;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.marketplace.MarketplaceListingRepository;
import com.uav.platform.repository.marketplace.ProviderDocumentRepository;
import com.uav.platform.repository.marketplace.ProviderPilotRepository;
import com.uav.platform.repository.marketplace.ProviderProfileRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderFleetService;
import com.uav.platform.specification.mission.lifecycle.MissionSpecifications;
import com.uav.platform.transport.websocket.RealtimeEventBroadcaster;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class MarketplaceProviderFleetServiceImpl implements MarketplaceProviderFleetService {

    private final ProviderProfileRepository providers;
    private final ProviderDocumentRepository documents;
    private final ProviderPilotRepository pilots;
    private final MarketplaceListingRepository listings;
    private final ServiceOfferingRepository serviceOfferings;
    private final UavRepository uavs;
    private final EquipmentRepository equipmentRepository;
    private final MissionRepository missions;
    private final MissionEventRepository missionEvents;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService audit;
    private final MarketplaceMapper mapper;
    private final MissionMapper missionMapper;

    @Autowired(required = false)
    private RealtimeEventBroadcaster realtime;

    @Override
    @Transactional(readOnly = true)
    public List<ProviderDocumentResponse> listMyDocuments(String username) {
        ProviderProfile provider = resolveProfile(username).orElse(null);
        if (provider == null) {
            return List.of();
        }
        return documents.findByProviderIdOrderByCreatedAtDesc(provider.getId()).stream()
                .map(mapper::toDocumentResponse)
                .toList();
    }

    @Override
    public MarketplaceListingResponse createListingFromTemplate(
            CreateListingFromTemplateRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        if (provider.getVerificationStatus() == ProviderVerificationStatus.SUSPENDED) {
            throw SystemException.forbidden("Đối tác đang bị tạm đình chỉ.", "PROVIDER_SUSPENDED");
        }
        ServiceOffering template =
                serviceOfferings
                        .findById(request.serviceOfferingId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                        "Không tìm thấy mẫu dịch vụ.",
                                                        "SERVICE_TEMPLATE_NOT_FOUND")
                                                .at("serviceOfferingId"));

        String title =
                trimOrNull(request.title()) != null
                        ? request.title().trim()
                        : template.getName() + " — minh hoạ";
        MissionType missionType = mapMissionType(template.getCode());
        PricingModel pricingModel =
                request.pricingModel() != null
                        ? request.pricingModel()
                        : ("DATA_COLLECTION".equalsIgnoreCase(template.getCode())
                                ? PricingModel.PER_HECTARE
                                : PricingModel.PER_HOUR);
        BigDecimal defaultPrice =
                pricingModel == PricingModel.PER_HECTARE
                        ? new BigDecimal("450000")
                        : new BigDecimal("2800000");
        BigDecimal basePrice =
                request.basePriceVnd() != null && request.basePriceVnd().signum() > 0
                        ? request.basePriceVnd().setScale(0, RoundingMode.HALF_UP)
                        : defaultPrice;

        MarketplaceListing listing = new MarketplaceListing();
        listing.setProvider(provider);
        listing.setCategoryService(template);
        listing.setSlug(
                MarketplaceSlugOperations.uniqueSlug(title, "listing", listings::existsBySlug));
        listing.setTitle(title);
        listing.setSummary(
                template.getDescription() != null && !template.getDescription().isBlank()
                        ? truncate(template.getDescription().trim(), 500)
                        : "Gói dịch vụ bay theo mẫu chuẩn trên nền tảng UAV PAS — dữ liệu minh hoạ.");
        listing.setDescription(
                template.getDescription() != null && !template.getDescription().isBlank()
                        ? template.getDescription().trim()
                        : "Dịch vụ triển khai theo mẫu kỹ thuật của nền tảng — minh hoạ.");
        listing.setListingType(
                "UAV_RENTAL".equalsIgnoreCase(template.getCode())
                        ? ListingType.WET_LEASE
                        : ListingType.FLIGHT_SERVICE);
        listing.setMissionType(missionType);
        listing.setPricingModel(pricingModel);
        listing.setBasePriceVnd(basePrice);
        listing.setMinBookingUnits(
                request.minBookingUnits() != null && request.minBookingUnits().signum() > 0
                        ? request.minBookingUnits()
                        : BigDecimal.ONE);
        listing.setSecurityDepositVnd(BigDecimal.ZERO);
        listing.setProvince(
                trimOrNull(request.province()) != null
                        ? request.province().trim()
                        : (provider.getProvince() != null ? provider.getProvince() : "Toàn quốc"));
        listing.setServiceRadiusKm(
                request.serviceRadiusKm() != null && request.serviceRadiusKm() > 0
                        ? request.serviceRadiusKm()
                        : Math.max(50, provider.getServiceRadiusKm()));
        listing.setEquipmentSpecs(
                trimOrNull(request.equipmentSpecs()) != null
                        ? request.equipmentSpecs().trim()
                        : (template.getSensors() != null && !template.getSensors().isBlank()
                                ? "Cảm biến hỗ trợ: " + template.getSensors()
                                : "Tàu bay đa cánh quạt cảm biến quang học — minh hoạ"));
        listing.setDeliverablesSummary(
                trimOrNull(request.deliverablesSummary()) != null
                        ? request.deliverablesSummary().trim()
                        : "Ảnh chụp thực địa, bản đồ trực quan & biên bản bàn giao số — minh hoạ");
        listing.setCoverImageUrl(validateOptionalHttpUrl(request.coverImageUrl()));
        listing.setOnSiteSlaHours(
                request.onSiteSlaHours() != null
                        ? request.onSiteSlaHours()
                        : (template.getOnSiteHours() != null ? template.getOnSiteHours() : 24));
        listing.setDeliverySlaHours(
                request.deliverySlaHours() != null
                        ? request.deliverySlaHours()
                        : (template.getDeliveryHours() != null ? template.getDeliveryHours() : 48));
        listing.setModerationStatus(
                Boolean.FALSE.equals(request.submitForReview())
                        ? ListingModerationStatus.DRAFT
                        : ListingModerationStatus.PENDING_REVIEW);
        listing.setDeleted(false);

        MarketplaceListing saved = listings.save(listing);
        audit.record(
                provider.getUser() != null ? provider.getUser().getId() : null,
                username,
                AuditAction.CREATE,
                "MARKETPLACE_LISTING",
                saved.getId().toString(),
                "template=" + template.getCode());
        return mapper.toListingResponse(saved);
    }

    @Override
    public void deleteListing(Long listingId, String username) {
        ProviderProfile provider = requireMyProfile(username);
        MarketplaceListing listing =
                listings.findWithDetailsById(listingId)
                        .filter(l -> !l.isDeleted())
                        .orElseThrow(() -> SystemException.notFound("LISTING_NOT_FOUND"));
        if (listing.getProvider() == null
                || !Objects.equals(listing.getProvider().getId(), provider.getId())) {
            throw SystemException.forbidden(
                    "Chỉ được xoá dịch vụ thuộc đội bay của bạn.", "LISTING_ACCESS_DENIED");
        }
        listing.setModerationStatus(ListingModerationStatus.PAUSED);
        listing.setDeleted(true);
        listings.save(listing);
        audit.record(
                provider.getUser() != null ? provider.getUser().getId() : null,
                username,
                AuditAction.DELETE,
                "MARKETPLACE_LISTING",
                listing.getId().toString(),
                listing.getSlug());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProviderUavResponse> listMyUavs(String username) {
        ProviderProfile provider = resolveProfile(username).orElse(null);
        if (provider == null) {
            return List.of();
        }
        return uavs.findByProviderIdOrderByIdDesc(provider.getId()).stream()
                .filter(u -> u.getStatus() != UavStatus.INACTIVE)
                .map(mapper::toUavResponse)
                .toList();
    }

    @Override
    public ProviderUavResponse updateMyUav(
            Long uavId, ProviderUavUpdateRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        Uav uav = requireOwnedUav(uavId, provider);
        if (request.serialNumber() != null && !request.serialNumber().isBlank()) {
            String nextSerial = request.serialNumber().trim();
            if (!nextSerial.equals(uav.getSerialNumber())
                    && uavs.existsBySerialNumber(nextSerial)) {
                throw SystemException.conflict("Số serial UAV đã tồn tại trên hệ thống.")
                        .at("serialNumber");
            }
            uav.setSerialNumber(nextSerial);
        }
        if (request.model() != null && !request.model().isBlank()) {
            uav.setModel(request.model().trim());
        }
        if (request.manufacturer() != null && !request.manufacturer().isBlank()) {
            uav.setManufacturer(request.manufacturer().trim());
        }
        if (request.status() != null) {
            if (request.status() != UavStatus.IN_USE
                    && missions.findFirstByUavIdAndStatusOrderByIdDesc(
                                    uav.getId(), MissionStatus.IN_PROGRESS)
                            .isPresent()) {
                throw SystemException.conflict(
                        "Không thể đổi trạng thái khi UAV đang thực hiện chuyến bay.",
                        "UAV_CURRENTLY_IN_FLIGHT");
            }
            uav.setStatus(request.status());
        }
        return mapper.toUavResponse(uavs.save(uav));
    }

    @Override
    public void deleteMyUav(Long uavId, String username) {
        ProviderProfile provider = requireMyProfile(username);
        Uav uav = requireOwnedUav(uavId, provider);
        if (missions.existsByUavIdAndStatusNotIn(
                uav.getId(), OrderStatusGroups.TERMINAL_NON_ACTIVE_STATUSES)) {
            throw SystemException.conflict(
                    "Không thể xoá UAV đang được phân công trong đơn hàng chưa kết thúc.",
                    "UAV_IN_ACTIVE_ORDER");
        }
        for (ProviderPilot pilot :
                pilots.findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(provider.getId())) {
            if (pilot.getAssignedUav() != null
                    && Objects.equals(pilot.getAssignedUav().getId(), uav.getId())) {
                pilot.setAssignedUav(null);
                pilots.save(pilot);
            }
        }
        uav.setProvider(null);
        uav.setStatus(UavStatus.INACTIVE);
        uavs.save(uav);
        audit.record(
                provider.getUser() != null ? provider.getUser().getId() : null,
                username,
                AuditAction.DELETE,
                "PROVIDER_UAV",
                uav.getId().toString(),
                uav.getSerialNumber());
    }

    @Override
    public void deleteMyEquipment(Long equipmentId, String username) {
        ProviderProfile provider = requireMyProfile(username);
        Equipment eq =
                equipmentRepository
                        .findById(equipmentId)
                        .filter(
                                e ->
                                        e.getProvider() != null
                                                && Objects.equals(
                                                        e.getProvider().getId(), provider.getId()))
                        .orElseThrow(() -> SystemException.notFound("EQUIPMENT_NOT_FOUND"));
        eq.setProvider(null);
        eq.setStatus(EquipmentStatus.INACTIVE);
        equipmentRepository.save(eq);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProviderPilotResponse> listMyPilots(String username) {
        ProviderProfile provider = resolveProfile(username).orElse(null);
        if (provider == null) {
            return List.of();
        }
        return pilots.findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(provider.getId()).stream()
                .map(p -> mapper.toPilotResponse(p, countCompletedForPilot(p)))
                .toList();
    }

    @Override
    public ProviderPilotResponse createPilot(ProviderPilotUpsertRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        Long requestedUserId =
                request.pilotUserId() != null ? request.pilotUserId() : request.userId();
        AppUser pilotUser = resolveOrCreatePilotUser(provider, requestedUserId, request);

        ProviderPilot pilot = new ProviderPilot();
        pilot.setProvider(provider);
        pilot.setPilotUser(pilotUser);
        pilot.setFullName(request.fullName().trim());
        pilot.setEmail(trimOrNull(request.email()));
        pilot.setPhone(trimOrNull(request.phone()));
        pilot.setLicenseNumber(trimOrNull(request.licenseNumber()));
        pilot.setSpecialization(trimOrNull(request.specialization()));
        pilot.setPilotStatus(
                request.status() != null ? request.status() : ProviderPilotStatus.AVAILABLE);
        if (request.assignedUavId() != null) {
            pilot.setAssignedUav(requireOwnedUav(request.assignedUavId(), provider));
        }
        pilot.setDeleted(false);
        ProviderPilot saved = pilots.save(pilot);
        audit.record(
                provider.getUser() != null ? provider.getUser().getId() : null,
                username,
                AuditAction.CREATE,
                "PROVIDER_PILOT",
                saved.getId().toString(),
                saved.getFullName());
        return mapper.toPilotResponse(saved, countCompletedForPilot(saved));
    }

    @Override
    public ProviderPilotResponse updatePilot(
            Long pilotId, ProviderPilotPatchRequest request, String username) {
        ProviderProfile provider = requireMyProfile(username);
        ProviderPilot pilot =
                pilots.findByIdAndProviderIdAndDeletedFalse(pilotId, provider.getId())
                        .orElseThrow(() -> SystemException.notFound("PILOT_NOT_FOUND"));
        if (request.fullName() != null && !request.fullName().isBlank()) {
            pilot.setFullName(request.fullName().trim());
        }
        if (request.email() != null) {
            pilot.setEmail(trimOrNull(request.email()));
        }
        if (request.phone() != null) {
            pilot.setPhone(trimOrNull(request.phone()));
        }
        if (request.licenseNumber() != null) {
            pilot.setLicenseNumber(trimOrNull(request.licenseNumber()));
        }
        if (request.specialization() != null) {
            pilot.setSpecialization(trimOrNull(request.specialization()));
        }
        if (request.status() != null) {
            pilot.setPilotStatus(request.status());
        }
        if (request.assignedUavId() != null) {
            pilot.setAssignedUav(requireOwnedUav(request.assignedUavId(), provider));
        }
        ProviderPilot saved = pilots.save(pilot);
        return mapper.toPilotResponse(saved, countCompletedForPilot(saved));
    }

    @Override
    public void deletePilot(Long pilotId, String username) {
        ProviderProfile provider = requireMyProfile(username);
        ProviderPilot pilot =
                pilots.findById(pilotId)
                        .filter(p -> !p.isDeleted())
                        .orElseThrow(() -> SystemException.notFound("PILOT_NOT_FOUND"));
        if (pilot.getProvider() == null
                || !Objects.equals(pilot.getProvider().getId(), provider.getId())) {
            throw SystemException.forbidden(
                    "Chỉ được thao tác trên kỹ sư thuộc đội bay của bạn.",
                    "PROVIDER_PILOT_MISMATCH");
        }
        pilot.setPilotStatus(ProviderPilotStatus.OFF_DUTY);
        pilot.setAssignedUav(null);
        pilot.setDeleted(true);
        pilots.save(pilot);
        audit.record(
                provider.getUser() != null ? provider.getUser().getId() : null,
                username,
                AuditAction.DELETE,
                "PROVIDER_PILOT",
                pilot.getId().toString(),
                pilot.getFullName());
    }

    @Override
    @Transactional(readOnly = true)
    public MissionResponse getMyOrder(Long missionId, String username) {
        ProviderProfile provider =
                resolveProfile(username)
                        .orElseThrow(
                                () ->
                                        SystemException.forbidden(
                                                "Tài khoản không thuộc đội bay nào.",
                                                "PROVIDER_PROFILE_REQUIRED"));
        Mission mission =
                missions.findById(missionId)
                        .orElseThrow(() -> SystemException.notFound("ORDER_NOT_FOUND"));
        if (mission.getProvider() == null
                || !Objects.equals(mission.getProvider().getId(), provider.getId())) {
            throw SystemException.forbidden(
                    "Bạn không có quyền xem đơn hàng thuộc đội bay khác.", "ORDER_ACCESS_DENIED");
        }
        if (!isFleetOwner(provider, username)
                && (mission.getOperator() == null
                        || !username.equalsIgnoreCase(mission.getOperator().getUsername()))) {
            throw SystemException.forbidden(
                    "Kỹ sư chỉ được xem đơn hàng được phân công cho chính mình.",
                    "PILOT_ORDER_ACCESS_DENIED");
        }
        return missionMapper.toResponse(mission);
    }

    @Override
    public MissionResponse assignOrder(
            Long missionId, ProviderOrderAssignRequest request, String username) {
        ProviderProfile provider = requireVerifiedProfile(username);
        Mission mission =
                missions.findByIdForUpdate(missionId)
                        .orElseThrow(() -> SystemException.notFound("ORDER_NOT_FOUND"));
        if (mission.getProvider() == null
                || !Objects.equals(mission.getProvider().getId(), provider.getId())) {
            throw SystemException.forbidden(
                    "Bạn không có quyền phân công đơn hàng thuộc đội bay khác.",
                    "ORDER_ACCESS_DENIED");
        }
        if (OrderStatusGroups.TERMINAL_NON_ACTIVE_STATUSES.contains(mission.getStatus())
                || mission.getStatus() == MissionStatus.IN_PROGRESS) {
            throw SystemException.conflict(
                    "Đơn hàng đang bay hoặc đã kết thúc, không thể đổi phân công.",
                    "ORDER_CANNOT_ASSIGN");
        }

        Uav uav = requireOwnedUav(request.uavId(), provider);
        if (uav.getStatus() == UavStatus.MAINTENANCE || uav.getStatus() == UavStatus.INACTIVE) {
            throw SystemException.conflict(
                    "Thiết bị bay đang bảo trì hoặc ngừng khai thác.", "UAV_NOT_AVAILABLE");
        }

        AppUser assignedOperator = resolveAssignedOperator(provider, request);
        MissionStatus previous = mission.getStatus();
        mission.setUav(uav);
        mission.setOperator(assignedOperator);
        mission.setOperatorAccepted(true);
        mission.setProviderResponseStatus(ProviderOrderStatus.ACCEPTED);
        mission.setProviderRespondedAt(LocalDateTime.now());
        if (request.note() != null && !request.note().isBlank()) {
            mission.setProviderResponseNote(request.note().trim());
        }
        mission.setStatus(MissionStatus.READY);
        Mission saved = missions.save(mission);

        missionEvents.save(
                new MissionEvent(
                        saved,
                        MissionEventType.OPERATOR_ACCEPTED,
                        assignedOperator,
                        previous,
                        MissionStatus.READY,
                        "Đã phân công kỹ sư "
                                + assignedOperator.getFullName()
                                + " & UAV "
                                + uav.getSerialNumber(),
                        trimOrNull(request.note())));

        if (realtime != null) {
            realtime.publishOrderUpdated(
                    saved.getId(),
                    saved.getStatus().name(),
                    OrderStatusGroups.SCHEDULED,
                    saved.getCustomer() != null ? saved.getCustomer().getId() : null,
                    provider.getUser() != null ? provider.getUser().getId() : null,
                    assignedOperator.getId());
        }

        return missionMapper.toResponse(saved);
    }

    private AppUser resolveAssignedOperator(
            ProviderProfile provider, ProviderOrderAssignRequest request) {
        if (request.pilotId() != null) {
            ProviderPilot pilot =
                    pilots.findByIdAndProviderIdAndDeletedFalse(request.pilotId(), provider.getId())
                            .orElseThrow(
                                    () ->
                                            SystemException.forbidden(
                                                    "Kỹ sư không thuộc đội bay của bạn.",
                                                    "PROVIDER_PILOT_MISMATCH"));
            if (pilot.getPilotUser() != null) {
                return pilot.getPilotUser();
            }
        }
        if (request.pilotUserId() != null) {
            List<ProviderPilot> linked =
                    pilots.findByPilotUserIdAndDeletedFalse(request.pilotUserId());
            for (ProviderPilot p : linked) {
                if (p.getProvider() != null
                        && Objects.equals(p.getProvider().getId(), provider.getId())
                        && p.getPilotUser() != null) {
                    return p.getPilotUser();
                }
            }
            Optional<ProviderPilot> byPilotRowId =
                    pilots.findByIdAndProviderIdAndDeletedFalse(
                            request.pilotUserId(), provider.getId());
            if (byPilotRowId.isPresent() && byPilotRowId.get().getPilotUser() != null) {
                return byPilotRowId.get().getPilotUser();
            }
            if (provider.getUser() != null
                    && Objects.equals(provider.getUser().getId(), request.pilotUserId())) {
                return provider.getUser();
            }
            throw SystemException.forbidden(
                    "Kỹ sư được chọn không thuộc đội bay của bạn.", "PROVIDER_PILOT_MISMATCH");
        }
        return provider.getUser();
    }

    private AppUser resolveOrCreatePilotUser(
            ProviderProfile provider, Long requestedUserId, ProviderPilotUpsertRequest request) {
        if (requestedUserId != null) {
            return users.findById(requestedUserId)
                    .orElseThrow(() -> SystemException.notFound("PILOT_USER_NOT_FOUND"));
        }
        String email = trimOrNull(request.email());
        if (email != null) {
            Optional<AppUser> existing = users.findByEmail(email);
            if (existing.isPresent()) {
                return existing.get();
            }
        }
        String generatedUsername = "pilot_" + provider.getId() + "_" + SecureTokens.hex(3);
        String generatedEmail = email != null ? email : generatedUsername + "@fleet.uav.local";
        AppUser created = new AppUser();
        created.setUsername(generatedUsername);
        created.setEmail(generatedEmail);
        created.setFullName(request.fullName().trim());
        created.setPhoneNumber(trimOrNull(request.phone()));
        created.setPasswordHash(passwordEncoder.encode(SecureTokens.base64Url(18)));
        created.setRole(UserRole.ROLE_OPERATOR);
        created.setStatus(UserStatus.ACTIVE);
        created.setEmailVerified(true);
        return users.save(created);
    }

    private long countCompletedForPilot(ProviderPilot pilot) {
        if (pilot.getPilotUser() == null || pilot.getPilotUser().getId() == null) {
            return 0L;
        }
        return missions.count(
                MissionSpecifications.hasOperator(pilot.getPilotUser().getId())
                        .and(MissionSpecifications.hasStatus(MissionStatus.COMPLETED)));
    }

    private Uav requireOwnedUav(Long uavId, ProviderProfile provider) {
        return uavs.findById(uavId)
                .filter(u -> u.getStatus() != UavStatus.INACTIVE)
                .filter(
                        u ->
                                u.getProvider() != null
                                        && Objects.equals(
                                                u.getProvider().getId(), provider.getId()))
                .orElseThrow(
                        () ->
                                SystemException.forbidden(
                                        "Chỉ được thao tác trên UAV thuộc đội bay của bạn.",
                                        "PROVIDER_UAV_MISMATCH"));
    }

    private Optional<ProviderProfile> resolveProfile(String username) {
        Optional<ProviderProfile> owned = providers.findByUserUsername(username);
        if (owned.isPresent()) {
            return owned;
        }
        return users.findByUsername(username)
                .flatMap(
                        u ->
                                pilots.findByPilotUserIdAndDeletedFalse(u.getId()).stream()
                                        .map(ProviderPilot::getProvider)
                                        .filter(Objects::nonNull)
                                        .findFirst());
    }

    private boolean isFleetOwner(ProviderProfile provider, String username) {
        return provider != null
                && provider.getUser() != null
                && username != null
                && username.equalsIgnoreCase(provider.getUser().getUsername());
    }

    private ProviderProfile requireMyProfile(String username) {
        ProviderProfile profile =
                resolveProfile(username)
                        .orElseThrow(
                                () ->
                                        SystemException.conflict(
                                                "Vui lòng khởi tạo Hồ sơ Đối tác trước khi thực hiện thao tác này.",
                                                "PROVIDER_PROFILE_REQUIRED"));
        if (!isFleetOwner(profile, username)) {
            throw SystemException.forbidden(
                    "Chỉ chủ đội bay mới có quyền quản trị tài nguyên đội bay.",
                    "FLEET_OWNER_REQUIRED");
        }
        return profile;
    }

    private ProviderProfile requireVerifiedProfile(String username) {
        ProviderProfile profile = requireMyProfile(username);
        if (profile.getVerificationStatus() != ProviderVerificationStatus.VERIFIED) {
            throw SystemException.forbidden(
                    "Hồ sơ Đối tác cần được xác minh (VERIFIED) để thực hiện nghiệp vụ này.",
                    "PROVIDER_NOT_VERIFIED");
        }
        return profile;
    }

    private static MissionType mapMissionType(String code) {
        if (code == null) {
            return MissionType.AREA_INSPECTION;
        }
        return switch (code.toUpperCase()) {
            case "UAV_RENTAL" -> MissionType.UAV_RENTAL;
            case "AREA_INSPECTION" -> MissionType.AREA_INSPECTION;
            case "AERIAL_RECORDING" -> MissionType.AERIAL_RECORDING;
            case "DATA_COLLECTION" -> MissionType.DATA_COLLECTION;
            default -> MissionType.OTHER;
        };
    }

    private static String validateOptionalHttpUrl(String raw) {
        String trimmed = trimOrNull(raw);
        if (trimmed == null) {
            return null;
        }
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
                    .at("coverImageUrl");
        }
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
