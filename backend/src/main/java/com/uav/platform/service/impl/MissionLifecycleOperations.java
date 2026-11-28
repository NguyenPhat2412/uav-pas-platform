package com.uav.platform.service.impl;

import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dto.request.AirspaceCheckRequest;
import com.uav.platform.dto.request.FlightPlanRequest;
import com.uav.platform.dto.request.MissionAcceptanceRequest;
import com.uav.platform.dto.request.MissionCompletionRequest;
import com.uav.platform.dto.request.MissionCreateRequest;
import com.uav.platform.dto.request.MissionForceFailRequest;
import com.uav.platform.dto.response.FlightPlanResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.dto.response.WeatherAssessmentResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionPreflightLog;
import com.uav.platform.enums.FlightClearanceLevel;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.MissionType;
import com.uav.platform.enums.ProviderOrderStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.MissionAccessService;
import com.uav.platform.service.WeatherService;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

final class MissionLifecycleOperations {

    private static final Set<MissionType> RESULT_REQUIRED_TYPES =
            Set.of(
                    MissionType.AREA_INSPECTION,
                    MissionType.AERIAL_RECORDING,
                    MissionType.DATA_COLLECTION);

    private MissionLifecycleOperations() {}

    static void applyListingBooking(
            Mission mission,
            MarketplaceListing listing,
            MissionCreateRequest request,
            AppUser customer) {
        if (listing.getModerationStatus() != ListingModerationStatus.PUBLISHED) {
            throw SystemException.conflict(
                            "Tin đăng dịch vụ hiện không mở đặt thuê.", "LISTING_NOT_PUBLISHED")
                    .at("listingId");
        }
        if (listing.getProvider() != null
                && listing.getProvider().getUser() != null
                && Objects.equals(listing.getProvider().getUser().getId(), customer.getId())) {
            throw SystemException.conflict(
                    "Bạn không thể tự đặt thuê dịch vụ do chính mình đăng bán.",
                    "SELF_BOOKING_FORBIDDEN");
        }
        BigDecimal minUnits =
                listing.getMinBookingUnits() != null
                        ? listing.getMinBookingUnits()
                        : BigDecimal.ONE;
        BigDecimal units = request.bookingUnits() != null ? request.bookingUnits() : minUnits;
        if (units.compareTo(minUnits) < 0) {
            throw SystemException.badRequest(
                            "Khối lượng đặt thuê tối thiểu là " + minUnits + " đơn vị.",
                            "MIN_BOOKING_UNITS")
                    .at("bookingUnits");
        }
        mission.setListing(listing);
        mission.setProvider(listing.getProvider());
        if (mission.getService() == null && listing.getCategoryService() != null) {
            mission.setService(listing.getCategoryService());
        }
        mission.setPricingModelSnapshot(listing.getPricingModel());
        mission.setUnitPriceSnapshotVnd(listing.getBasePriceVnd());
        mission.setBookingUnits(units);
        mission.setQuotedSubtotalVnd(
                listing.getBasePriceVnd().multiply(units).setScale(0, RoundingMode.HALF_UP));
        mission.setSecurityDepositVnd(listing.getSecurityDepositVnd());
        mission.setProviderResponseStatus(
                listing.getProvider() != null
                        ? ProviderOrderStatus.PENDING_PROVIDER
                        : ProviderOrderStatus.NOT_APPLICABLE);
        listing.setBookingCount(listing.getBookingCount() + 1);
    }

    static String validateCancelReason(String reason) {
        String note = reason == null || reason.isBlank() ? null : reason.trim();
        if (note != null && note.length() > 500) {
            throw SystemException.badRequest(
                            "Lý do hủy không được vượt quá 500 ký tự.",
                            "MISSION_CANCEL_REASON_TOO_LONG")
                    .at("reason");
        }
        return note;
    }

    static AirspaceCheckRequest buildStartAirspaceCheck(
            Mission mission, FlightPlanResponse storedPlan, LocalDateTime now) {
        long plannedMinutes =
                mission.getStartTime() != null && mission.getExpectedEndTime() != null
                        ? Math.max(
                                30L,
                                Duration.between(
                                                mission.getStartTime(),
                                                mission.getExpectedEndTime())
                                        .toMinutes())
                        : 60L;
        LocalDateTime effectiveStart =
                mission.getStartTime() != null && mission.getStartTime().isBefore(now)
                        ? mission.getStartTime()
                        : now;
        LocalDateTime actualEnd = now.plusMinutes(plannedMinutes);
        LocalDateTime effectiveEnd =
                mission.getExpectedEndTime() != null
                                && mission.getExpectedEndTime().isAfter(actualEnd)
                        ? mission.getExpectedEndTime()
                        : actualEnd;
        return MissionPermitOperations.toCheckRequest(
                storedPlan,
                mission.getLatitude(),
                mission.getLongitude(),
                effectiveStart,
                effectiveEnd);
    }

    static void validateCompletionRequest(MissionCompletionRequest request) {
        if (request == null
                || request.completionNote() == null
                || request.completionNote().isBlank()
                || request.equipmentCondition() == null
                || request.equipmentCondition().isBlank()
                || request.completionNote().length() > 500
                || request.equipmentCondition().length() > 500) {
            throw SystemException.badRequest("MISSION_HANDOVER_NOTES_REQUIRED");
        }
    }

    static boolean requiresHandoverResult(MissionType missionType) {
        return missionType != null && RESULT_REQUIRED_TYPES.contains(missionType);
    }

    static String validateForceFailRequest(MissionForceFailRequest request) {
        if (request == null
                || request.reason() == null
                || request.reason().isBlank()
                || request.reason().trim().length() > 500) {
            throw SystemException.badRequest(
                            "Phải nêu lý do (tối đa 500 ký tự) khi buộc kết thúc nhiệm vụ.",
                            "MISSION_FORCE_FAIL_REASON_REQUIRED")
                    .at("reason");
        }
        if (request.notes() != null && request.notes().length() > 2000) {
            throw SystemException.badRequest(
                            "Ghi chú không được vượt quá 2000 ký tự.", "MISSION_NOTES_TOO_LONG")
                    .at("notes");
        }
        return request.reason().trim();
    }

    static void requireForceFailAllowedStatus(MissionStatus status) {
        if (status != MissionStatus.IN_PROGRESS
                && status != MissionStatus.READY
                && status != MissionStatus.RESOURCE_RESERVED) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
    }

    static void validateOperatorAcceptance(Mission mission, MissionAcceptanceRequest request) {
        if (mission.getStatus() != MissionStatus.CONFIRMED
                && mission.getStatus() != MissionStatus.RESOURCE_RESERVED
                && mission.getStatus() != MissionStatus.READY) {
            throw new IllegalStateException("MISSION_INVALID_STATUS");
        }
        if (request == null || request.expectedVersion() == null || request.expectedVersion() < 0) {
            throw SystemException.badRequest("MISSION_ACCEPTANCE_VERSION_REQUIRED");
        }
        if (request.expectedVersion() != mission.getVersion() || mission.isOperatorAccepted()) {
            throw SystemException.conflict("MISSION_ACCEPTANCE_STALE");
        }
    }

    static void verifyPreflightClearance(
            java.util.Optional<MissionPreflightLog> existing, boolean preflightSignoffRequired) {
        if (existing != null && existing.isPresent() && !existing.get().isClearedForTakeoff()) {
            throw SystemException.conflict(
                    "Biên bản tiền bay chưa đạt đủ điều kiện an toàn để cất cánh hoặc cần ký lại sau khi thay đổi thiết bị.",
                    "MISSION_PREFLIGHT_NOT_CLEARED");
        }
        if ((existing == null || existing.isEmpty()) && preflightSignoffRequired) {
            throw SystemException.conflict(
                    "Nhiệm vụ phải hoàn tất biên bản kiểm tra an toàn tiền bay trước khi cất cánh.",
                    "MISSION_PREFLIGHT_NOT_CLEARED");
        }
    }

    static String formatPermitVerificationDetail(Mission mission, boolean approved) {
        return approved
                ? "Giấy phép bay " + mission.getPermitNumber() + " đã được xác minh hợp lệ."
                : "Giấy phép bay "
                        + mission.getPermitNumber()
                        + " bị từ chối thẩm định"
                        + (mission.getPermitNote() != null ? ": " + mission.getPermitNote() : ".");
    }

    static void validateAndLinkPermitMedia(
            Mission mission,
            Long permitMediaId,
            Authentication authentication,
            MissionAccessService access,
            IMediaAssetDao repo) {
        if (repo == null) return;
        MediaAsset asset =
                repo.findById(permitMediaId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                        "Tệp đính kèm giấy phép không tồn tại.",
                                                        "PERMIT_MEDIA_NOT_FOUND")
                                                .at("permitMediaId"));
        String missionIdStr = mission.getId() == null ? null : mission.getId().toString();
        String actorName = authentication == null ? null : authentication.getName();
        boolean linkedToMission =
                "MISSION".equals(asset.getLinkedEntityType())
                        && missionIdStr != null
                        && missionIdStr.equals(asset.getLinkedEntityId());
        boolean unlinkedAndAuthorized =
                asset.getLinkedEntityType() == null
                        && ((actorName != null && Objects.equals(asset.getUploadedBy(), actorName))
                                || access.hasAuthority(authentication, "MISSION_CONFIRM"));
        if (!linkedToMission && !unlinkedAndAuthorized) {
            throw new AccessDeniedException(
                    "Not authorized to attach this media asset to mission permit");
        }
        if (asset.isDeleted() || !asset.isConfirmed()) {
            throw SystemException.conflict(
                            "Tệp đính kèm giấy phép chưa được xác nhận tải lên hoặc đã bị xóa.",
                            "PERMIT_MEDIA_NOT_CONFIRMED")
                    .at("permitMediaId");
        }
        if (unlinkedAndAuthorized && missionIdStr != null) {
            asset.setLinkedEntityType("MISSION");
            asset.setLinkedEntityId(missionIdStr);
            repo.save(asset);
        }
    }

    static void applyFlightPlan(Mission mission, FlightPlanRequest plan) {
        if (plan == null) return;
        var resolved = FlightPlanOperations.resolve(plan);
        mission.setFlightPlan(FlightPlanOperations.write(resolved));
        mission.setLatitude(BigDecimal.valueOf(resolved.centerLatitude()));
        mission.setLongitude(BigDecimal.valueOf(resolved.centerLongitude()));
    }

    static String assessPreflightWeather(Mission mission, WeatherService service) {
        if (service == null || mission.getLatitude() == null || mission.getLongitude() == null) {
            return null;
        }
        WeatherAssessmentResponse assessment;
        boolean block;
        try {
            Double serviceMaxWind =
                    mission.getService() == null ? null : mission.getService().getMaxWindMs();
            assessment =
                    service.assess(
                            mission.getLatitude().doubleValue(),
                            mission.getLongitude().doubleValue(),
                            null,
                            serviceMaxWind);
            block = service.preflightBlockEnabled();
        } catch (RuntimeException ex) {
            return null;
        }
        if (assessment.clearance() == FlightClearanceLevel.NO_GO && block) {
            throw SystemException.conflict("MISSION_WEATHER_UNSAFE");
        }
        return assessment.windSpeed80mMs() == null
                ? "weather " + assessment.clearance()
                : String.format(
                        Locale.ROOT,
                        "weather %s, wind 80 m %.1f m/s",
                        assessment.clearance(),
                        assessment.windSpeed80mMs());
    }

    static MissionResponse toViewerSafeResponse(
            Mission mission,
            MissionResponse response,
            Authentication authentication,
            MissionAccessService access) {
        if (response == null) return null;
        boolean anonymizeForCustomer =
                authentication != null
                        && mission.getCustomer() != null
                        && authentication
                                .getName()
                                .equalsIgnoreCase(mission.getCustomer().getUsername())
                        && !access.hasAuthority(authentication, "MISSION_VIEW_ALL")
                        && !access.hasAuthority(authentication, "MARKETPLACE_MODERATE")
                        && !(mission.getProvider() != null
                                && mission.getProvider().getUser() != null
                                && authentication
                                        .getName()
                                        .equalsIgnoreCase(
                                                mission.getProvider().getUser().getUsername()));
        if (!anonymizeForCustomer) return response;
        MissionResponse masked = response.withOrderContext(false, true);
        return masked != null ? masked : response;
    }

    static String missionLabel(Mission mission) {
        return mission.getCode() != null ? mission.getCode() : String.valueOf(mission.getId());
    }
}
