package com.uav.platform.service.impl;

import com.uav.platform.dto.request.MarketplaceListingUpsertRequest;
import com.uav.platform.dto.request.MissionBidCreateRequest;
import com.uav.platform.dto.request.PayoutCreateRequest;
import com.uav.platform.dto.request.ProviderOnboardingRequest;
import com.uav.platform.dto.request.ProviderOrderActionRequest;
import com.uav.platform.dto.request.ProviderOrderCompleteRequest;
import com.uav.platform.dto.response.ProviderPayoutResponse;
import com.uav.platform.dto.response.ProviderWalletResponse;
import com.uav.platform.dto.response.WalletTransactionResponse;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionBid;
import com.uav.platform.entity.ProviderDocument;
import com.uav.platform.entity.ProviderPayout;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.ProviderWallet;
import com.uav.platform.entity.Uav;
import com.uav.platform.entity.WalletTransaction;
import com.uav.platform.enums.MissionBidStatus;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.PayoutStatus;
import com.uav.platform.enums.PricingModel;
import com.uav.platform.enums.ProviderDocumentStatus;
import com.uav.platform.enums.ProviderDocumentType;
import com.uav.platform.enums.ProviderOrderStatus;
import com.uav.platform.enums.ProviderType;
import com.uav.platform.enums.ProviderVerificationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.enums.WalletTransactionType;
import com.uav.platform.error.SystemException;

import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

final class MarketplaceProviderOperations {

    private static final List<ProviderDocumentType> INDIVIDUAL_REQUIRED_DOCUMENTS =
            List.of(
                    ProviderDocumentType.IDENTITY_CARD,
                    ProviderDocumentType.PILOT_CERTIFICATE,
                    ProviderDocumentType.UAV_REGISTRATION,
                    ProviderDocumentType.INSURANCE_POLICY,
                    ProviderDocumentType.PLATFORM_FEE_AGREEMENT);

    private static final List<ProviderDocumentType> COMPANY_REQUIRED_DOCUMENTS =
            List.of(
                    ProviderDocumentType.IDENTITY_CARD,
                    ProviderDocumentType.BUSINESS_LICENSE,
                    ProviderDocumentType.PILOT_CERTIFICATE,
                    ProviderDocumentType.UAV_REGISTRATION,
                    ProviderDocumentType.INSURANCE_POLICY,
                    ProviderDocumentType.PLATFORM_FEE_AGREEMENT,
                    ProviderDocumentType.TAX_SETTLEMENT_DOSSIER);

    private MarketplaceProviderOperations() {}

    static void applyProfileFields(
            ProviderProfile profile, ProviderOnboardingRequest request, int defaultRadius) {
        profile.setDisplayName(request.displayName().trim());
        profile.setProviderType(request.providerType());
        profile.setTaxOrIdNumber(trimOrNull(request.taxOrIdNumber()));
        profile.setFlightLicenseNumber(trimOrNull(request.flightLicenseNumber()));
        profile.setBio(trimOrNull(request.bio()));
        profile.setProvince(request.province().trim());
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
    }

    static List<String> missingRequiredDocuments(
            ProviderProfile provider, List<ProviderDocument> docs) {
        List<ProviderDocumentType> requiredTypes =
                provider.getProviderType() == ProviderType.COMPANY
                        ? COMPANY_REQUIRED_DOCUMENTS
                        : INDIVIDUAL_REQUIRED_DOCUMENTS;
        Set<ProviderDocumentType> activeUploadedTypes =
                docs.stream()
                        .filter(d -> d.getStatus() != ProviderDocumentStatus.REJECTED)
                        .map(ProviderDocument::getDocumentType)
                        .collect(Collectors.toSet());
        return requiredTypes.stream()
                .filter(t -> !activeUploadedTypes.contains(t))
                .map(Enum::name)
                .toList();
    }

    static void applyListingCoreFields(
            MarketplaceListing listing,
            MarketplaceListingUpsertRequest request,
            int defaultRadius) {
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
        listing.setServiceRadiusKm(
                request.serviceRadiusKm() != null ? request.serviceRadiusKm() : defaultRadius);
        listing.setEquipmentSpecs(trimOrNull(request.equipmentSpecs()));
        listing.setDeliverablesSummary(trimOrNull(request.deliverablesSummary()));
        listing.setCoverImageUrl(validateOptionalHttpUrl(request.coverImageUrl(), "coverImageUrl"));
        listing.setOnSiteSlaHours(request.onSiteSlaHours());
        listing.setDeliverySlaHours(request.deliverySlaHours());
    }

    static void validateRespondRequest(Mission mission, ProviderOrderActionRequest request) {
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
    }

    static void validateProviderUav(Uav uav, ProviderProfile provider) {
        if (uav.getProvider() == null
                || !Objects.equals(uav.getProvider().getId(), provider.getId())) {
            throw SystemException.forbidden(
                    "Chỉ được gán UAV thuộc quyền sở hữu của đối tác.", "PROVIDER_UAV_MISMATCH");
        }
        if (uav.getStatus() == UavStatus.MAINTENANCE || uav.getStatus() == UavStatus.INACTIVE) {
            throw SystemException.conflict(
                    "Thiết bị bay đang bảo trì hoặc ngừng khai thác.", "UAV_NOT_AVAILABLE");
        }
    }

    static void resetDeclinedOrder(Mission mission) {
        mission.setProvider(null);
        mission.setUav(null);
        mission.setOperator(null);
        mission.setOperatorAccepted(false);
        mission.setProviderResponseStatus(ProviderOrderStatus.PENDING_DISPATCH);
        mission.setStatus(MissionStatus.PENDING_CONFIRMATION);
    }

    static void validateCompleteOrder(Mission mission, ProviderOrderCompleteRequest request) {
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
    }

    static void validateOpenRfqForBid(
            Mission mission, ProviderProfile provider, Set<MissionStatus> openRfqStatuses) {
        if (mission.getProviderResponseStatus() != ProviderOrderStatus.OPEN_RFQ
                || !openRfqStatuses.contains(mission.getStatus())) {
            throw SystemException.conflict(
                    "Yêu cầu này không còn mở nhận chào thầu.", "RFQ_CLOSED");
        }
        if (mission.getCustomer() != null
                && Objects.equals(mission.getCustomer().getId(), provider.getUser().getId())) {
            throw SystemException.conflict(
                    "Không thể tự báo giá cho yêu cầu của chính mình.", "SELF_BID_FORBIDDEN");
        }
    }

    static void applyBidFields(MissionBid bid, MissionBidCreateRequest request) {
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
    }

    static void validateRfqOpenForAcceptance(
            Mission mission,
            String actorUsername,
            boolean canManage,
            Set<MissionStatus> openRfqStatuses) {
        boolean isCustomerOwner =
                mission.getCustomer() != null
                        && Objects.equals(mission.getCustomer().getUsername(), actorUsername);
        if (!isCustomerOwner && !canManage) {
            throw new AccessDeniedException("Chỉ chủ nhiệm vụ mới được chọn nhà thầu.");
        }
        if (mission.getProviderResponseStatus() != ProviderOrderStatus.OPEN_RFQ
                || !openRfqStatuses.contains(mission.getStatus())) {
            throw SystemException.conflict(
                    "Yêu cầu báo giá đã đóng hoặc đã chọn nhà thầu.", "RFQ_CLOSED");
        }
    }

    static void validateWinningBid(MissionBid winning) {
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
    }

    static void applyAcceptedBid(Mission mission, MissionBid winning, LocalDateTime now) {
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
    }

    static ProviderWalletResponse buildWalletResponse(
            ProviderProfile provider,
            ProviderWallet wallet,
            BigDecimal feeRate,
            List<WalletTransactionResponse> txs,
            List<ProviderPayoutResponse> myPayouts) {
        return new ProviderWalletResponse(
                provider.getId(),
                provider.getDisplayName(),
                feeRate,
                wallet.getEscrowHeldVnd(),
                wallet.getAvailableBalanceVnd(),
                wallet.getPendingPayoutVnd(),
                wallet.getTotalEarnedVnd(),
                wallet.getTotalWithdrawnVnd(),
                provider.getBankName(),
                provider.getBankAccountNumber(),
                provider.getBankAccountHolder(),
                txs,
                myPayouts);
    }

    static void requireBankInfo(ProviderProfile provider) {
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
    }

    static BigDecimal validatePayoutAmount(
            ProviderWallet wallet,
            PayoutCreateRequest request,
            BigDecimal minPayout,
            BigDecimal maxPayout) {
        BigDecimal amount = request.amountVnd().setScale(0, RoundingMode.HALF_UP);
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
        return amount;
    }

    static ProviderPayout buildPayout(
            ProviderProfile provider, BigDecimal amount, String providerNote) {
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
        payout.setProviderNote(trimOrNull(providerNote));
        return payout;
    }

    static WalletTransaction buildPayoutLedgerTx(
            ProviderWallet wallet, ProviderPayout saved, BigDecimal amount) {
        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setPayout(saved);
        tx.setTransactionType(WalletTransactionType.PAYOUT_REQUEST);
        tx.setGrossAmountVnd(amount);
        tx.setFeeAmountVnd(BigDecimal.ZERO);
        tx.setNetAmountVnd(amount.negate());
        tx.setBalanceAfterVnd(wallet.getAvailableBalanceVnd());
        tx.setDescription("Yêu cầu rút tiền " + saved.getCode() + " về " + saved.getBankName());
        return tx;
    }

    static boolean isFleetOwner(ProviderProfile provider, String username) {
        return provider != null
                && provider.getUser() != null
                && username != null
                && username.equalsIgnoreCase(provider.getUser().getUsername());
    }

    static String validateOptionalHttpUrl(String raw, String field) {
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

    static String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
