package com.uav.platform.mapper.marketplace.provider;

import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceReviewResponse;
import com.uav.platform.dto.response.marketplace.catalog.MissionBidResponse;
import com.uav.platform.dto.response.marketplace.catalog.ProviderBadgeResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderPayoutResponse;
import com.uav.platform.dto.response.marketplace.escrow.WalletTransactionResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderDocumentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderEquipmentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderPilotResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderUavResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.marketplace.MissionBid;
import com.uav.platform.entity.marketplace.ProviderDocument;
import com.uav.platform.entity.marketplace.ProviderPayout;
import com.uav.platform.entity.marketplace.ProviderPilot;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.entity.marketplace.WalletTransaction;
import com.uav.platform.entity.mission.MissionReview;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class MarketplaceMapper {

    public ProviderDocumentResponse toDocumentResponse(ProviderDocument doc) {
        return new ProviderDocumentResponse(
                doc.getId(),
                doc.getDocumentType(),
                doc.getTitle(),
                doc.getDocumentNumber(),
                doc.getFileUrl(),
                doc.getMediaAsset() != null ? doc.getMediaAsset().getId() : null,
                doc.getStatus(),
                doc.getReviewerNote(),
                doc.getCreatedAt());
    }

    public ProviderProfileResponse toProfileResponse(
            ProviderProfile profile, List<ProviderDocument> documents) {
        return new ProviderProfileResponse(
                profile.getId(),
                profile.getUser() != null ? profile.getUser().getId() : null,
                profile.getUser() != null ? profile.getUser().getUsername() : null,
                profile.getSlug(),
                profile.getDisplayName(),
                profile.getProviderType(),
                profile.getTaxOrIdNumber(),
                profile.getFlightLicenseNumber(),
                profile.getBio(),
                profile.getProvince(),
                profile.getServiceRadiusKm(),
                profile.getContactPhone(),
                profile.getBankName(),
                profile.getBankAccountNumber(),
                profile.getBankAccountHolder(),
                profile.getVerificationStatus(),
                profile.getReviewNote(),
                profile.getVerifiedAt(),
                profile.getVerifiedBy(),
                profile.getCommissionRateOverride(),
                profile.getRatingAvg(),
                profile.getReviewCount(),
                profile.getCompletedMissionsCount(),
                profile.getCreatedAt(),
                documents == null
                        ? List.of()
                        : documents.stream().map(this::toDocumentResponse).toList());
    }

    public ProviderBadgeResponse toProviderBadge(MarketplaceListing listing) {
        var provider = listing.getProvider();
        boolean verified =
                provider == null
                        || provider.getVerificationStatus() == ProviderVerificationStatus.VERIFIED;
        BigDecimal rating =
                listing.getReviewCount() > 0 || provider == null
                        ? listing.getRatingAvg()
                        : (provider.getRatingAvg() != null
                                ? provider.getRatingAvg()
                                : BigDecimal.ZERO);
        int reviews =
                listing.getReviewCount() > 0 || provider == null
                        ? listing.getReviewCount()
                        : provider.getReviewCount();
        return new ProviderBadgeResponse(
                verified, rating != null ? rating : BigDecimal.ZERO, reviews);
    }

    /** Full listing projection for Admin moderation and Seller Studio. */
    public MarketplaceListingResponse toListingResponse(MarketplaceListing listing) {
        var provider = listing.getProvider();
        var category = listing.getCategoryService();
        return new MarketplaceListingResponse(
                listing.getId(),
                provider != null ? provider.getId() : null,
                provider != null ? provider.getSlug() : null,
                provider != null ? provider.getDisplayName() : "Đối tác đã xác minh UAV PAS",
                provider != null ? provider.getVerificationStatus() : null,
                provider == null,
                category != null ? category.getId() : null,
                category != null ? category.getCode() : null,
                category != null ? category.getName() : null,
                listing.getSlug(),
                listing.getTitle(),
                listing.getSummary(),
                listing.getDescription(),
                listing.getListingType(),
                listing.getMissionType(),
                listing.getPricingModel(),
                listing.getBasePriceVnd(),
                listing.getMinBookingUnits(),
                listing.getSecurityDepositVnd(),
                listing.getProvince(),
                listing.getServiceRadiusKm(),
                listing.getEquipmentSpecs(),
                listing.getDeliverablesSummary(),
                listing.getCoverImageUrl(),
                listing.getOnSiteSlaHours(),
                listing.getDeliverySlaHours(),
                listing.getModerationStatus(),
                listing.getModerationNote(),
                listing.getRatingAvg(),
                listing.getReviewCount(),
                listing.getBookingCount(),
                listing.isFeatured(),
                listing.getCreatedAt(),
                toProviderBadge(listing));
    }

    /** Anonymized listing projection for public/customer marketplace: hides fleet name and slug. */
    public MarketplaceListingResponse toPublicListingResponse(MarketplaceListing listing) {
        var provider = listing.getProvider();
        var category = listing.getCategoryService();
        return new MarketplaceListingResponse(
                listing.getId(),
                null,
                null,
                null,
                provider != null
                        ? provider.getVerificationStatus()
                        : ProviderVerificationStatus.VERIFIED,
                true,
                category != null ? category.getId() : null,
                category != null ? category.getCode() : null,
                category != null ? category.getName() : null,
                listing.getSlug(),
                listing.getTitle(),
                listing.getSummary(),
                listing.getDescription(),
                listing.getListingType(),
                listing.getMissionType(),
                listing.getPricingModel(),
                listing.getBasePriceVnd(),
                listing.getMinBookingUnits(),
                listing.getSecurityDepositVnd(),
                listing.getProvince(),
                listing.getServiceRadiusKm(),
                listing.getEquipmentSpecs(),
                listing.getDeliverablesSummary(),
                listing.getCoverImageUrl(),
                listing.getOnSiteSlaHours(),
                listing.getDeliverySlaHours(),
                listing.getModerationStatus(),
                null,
                listing.getRatingAvg(),
                listing.getReviewCount(),
                listing.getBookingCount(),
                listing.isFeatured(),
                listing.getCreatedAt(),
                toProviderBadge(listing));
    }

    public MarketplaceReviewResponse toReviewResponse(MissionReview review) {
        var mission = review.getMission();
        var customer = review.getCustomer();
        String customerName =
                customer != null
                                && customer.getFullName() != null
                                && !customer.getFullName().isBlank()
                        ? customer.getFullName()
                        : (customer != null ? customer.getUsername() : "Khách hàng đã xác thực");
        return new MarketplaceReviewResponse(
                review.getId(),
                mission != null ? mission.getId() : null,
                mission != null ? mission.getTitle() : null,
                customerName,
                review.getOverallRating(),
                review.getDataQualityRating(),
                review.getTimelinessRating(),
                review.isDeliverablesAccepted(),
                review.getComment(),
                review.getUpdatedAt());
    }

    public ProviderUavResponse toUavResponse(Uav uav) {
        return new ProviderUavResponse(
                uav.getId(),
                uav.getModel(),
                uav.getSerialNumber(),
                uav.getManufacturer(),
                uav.getStatus(),
                uav.getCreatedAt());
    }

    public ProviderEquipmentResponse toEquipmentResponse(Equipment eq) {
        return new ProviderEquipmentResponse(
                eq.getId(),
                eq.getName(),
                eq.getType(),
                eq.getSerialNumber(),
                eq.getQuantity(),
                eq.getAvailableQuantity(),
                eq.getStatus(),
                eq.getCreatedAt());
    }

    public ProviderPilotResponse toPilotResponse(ProviderPilot pilot, long completedMissionsCount) {
        Long pilotUserId = pilot.getPilotUser() != null ? pilot.getPilotUser().getId() : null;
        return new ProviderPilotResponse(
                pilot.getId(),
                pilot.getProvider() != null ? pilot.getProvider().getId() : null,
                pilotUserId,
                pilotUserId,
                pilot.getFullName(),
                pilot.getEmail(),
                pilot.getPhone(),
                pilot.getLicenseNumber(),
                pilot.getSpecialization(),
                pilot.getPilotStatus(),
                pilot.getAssignedUav() != null ? pilot.getAssignedUav().getId() : null,
                pilot.getAssignedUav() != null ? pilot.getAssignedUav().getModel() : null,
                completedMissionsCount,
                pilot.getCreatedAt());
    }

    public WalletTransactionResponse toWalletTransactionResponse(WalletTransaction tx) {
        return new WalletTransactionResponse(
                tx.getId(),
                tx.getInvoice() != null ? tx.getInvoice().getId() : null,
                tx.getPayout() != null ? tx.getPayout().getId() : null,
                tx.getTransactionType(),
                tx.getGrossAmountVnd(),
                tx.getFeeAmountVnd(),
                tx.getNetAmountVnd(),
                tx.getBalanceAfterVnd(),
                tx.getDescription(),
                tx.getCreatedAt());
    }

    public ProviderPayoutResponse toPayoutResponse(ProviderPayout payout) {
        var provider = payout.getProvider();
        return new ProviderPayoutResponse(
                payout.getId(),
                payout.getCode(),
                provider != null ? provider.getId() : null,
                provider != null ? provider.getDisplayName() : null,
                payout.getAmountVnd(),
                payout.getBankName(),
                payout.getBankAccountNumber(),
                payout.getBankAccountHolder(),
                payout.getStatus(),
                payout.getProviderNote(),
                payout.getAdminNote(),
                payout.getBankTransferRef(),
                payout.getProcessedBy(),
                payout.getProcessedAt(),
                payout.getCreatedAt());
    }

    public MissionBidResponse toBidResponse(MissionBid bid) {
        var mission = bid.getMission();
        var provider = bid.getProvider();
        return new MissionBidResponse(
                bid.getId(),
                mission != null ? mission.getId() : null,
                mission != null ? mission.getCode() : null,
                mission != null ? mission.getTitle() : null,
                provider != null ? provider.getId() : null,
                provider != null ? provider.getSlug() : null,
                provider != null ? provider.getDisplayName() : null,
                provider != null ? provider.getRatingAvg() : null,
                provider != null ? provider.getCompletedMissionsCount() : 0,
                bid.getProposedPriceVnd(),
                bid.getEstimatedDeliveryHours(),
                bid.getProposalNote(),
                bid.getProposedUavModel(),
                bid.getStatus(),
                bid.getRespondedAt(),
                bid.getCreatedAt());
    }
}
