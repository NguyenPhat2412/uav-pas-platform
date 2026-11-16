package com.uav.platform.service.impl.marketplace.admin;

import static com.uav.platform.specification.marketplace.catalog.MarketplaceSpecifications.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.marketplace.admin.ListingModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutProcessRequest;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderPayoutResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.marketplace.ProviderDocument;
import com.uav.platform.entity.marketplace.ProviderPayout;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.entity.marketplace.ProviderWallet;
import com.uav.platform.entity.marketplace.WalletTransaction;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.PayoutStatus;
import com.uav.platform.enums.marketplace.ProviderDocumentStatus;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.marketplace.WalletTransactionType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.marketplace.provider.MarketplaceMapper;
import com.uav.platform.repository.marketplace.MarketplaceListingRepository;
import com.uav.platform.repository.marketplace.ProviderDocumentRepository;
import com.uav.platform.repository.marketplace.ProviderPayoutRepository;
import com.uav.platform.repository.marketplace.ProviderProfileRepository;
import com.uav.platform.repository.marketplace.ProviderWalletRepository;
import com.uav.platform.repository.marketplace.WalletTransactionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.marketplace.admin.MarketplaceAdminService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MarketplaceAdminServiceImpl implements MarketplaceAdminService {

    private final ProviderProfileRepository providers;
    private final ProviderDocumentRepository documents;
    private final MarketplaceListingRepository listings;
    private final ProviderWalletRepository wallets;
    private final ProviderPayoutRepository payouts;
    private final WalletTransactionRepository ledger;
    private final UserRepository users;
    private final AuditLogService audit;
    private final MarketplaceMapper mapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.beans.factory.ObjectProvider<
                    com.uav.platform.service.notification.inbox.NotificationService>
            notifications;

    private void notifyProvider(
            ProviderProfile provider,
            String title,
            String content,
            com.uav.platform.enums.notification.NotificationType type,
            String refType,
            Long refId) {
        if (provider == null
                || provider.getUser() == null
                || provider.getUser().getId() == null
                || notifications == null) return;
        var svc = notifications.getIfAvailable();
        if (svc == null) return;
        try {
            svc.sendNotification(
                    new com.uav.platform.dto.request.notification.inbox.CreateNotificationRequest(
                            provider.getUser().getId(), title, content, type, refType, refId));
        } catch (RuntimeException ignored) {
            // Best-effort realtime notification.
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProviderProfileResponse> listProviders(
            ProviderVerificationStatus status, String keyword, Pageable pageable) {
        Specification<ProviderProfile> spec =
                Specification.allOf(providerStatus(status), providerKeyword(keyword));
        Pageable sorted =
                PageRequest.of(
                        pageable.getPageNumber(),
                        Math.min(Math.max(pageable.getPageSize(), 1), 50),
                        Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id")));
        var page = providers.findAll(spec, sorted);
        List<Long> providerIds = page.getContent().stream().map(ProviderProfile::getId).toList();
        var docsByProvider =
                providerIds.isEmpty()
                        ? java.util.Map.<Long, List<ProviderDocument>>of()
                        : documents.findByProviderIdInOrderByCreatedAtDesc(providerIds).stream()
                                .collect(
                                        java.util.stream.Collectors.groupingBy(
                                                d -> d.getProvider().getId(),
                                                java.util.LinkedHashMap::new,
                                                java.util.stream.Collectors.toList()));
        return PageResponse.from(
                page,
                profile ->
                        mapper.toProfileResponse(
                                profile, docsByProvider.getOrDefault(profile.getId(), List.of())));
    }

    @Override
    public ProviderProfileResponse moderateProvider(
            Long providerId, ProviderModerationRequest request, String adminUsername) {
        ProviderProfile provider =
                providers
                        .findById(providerId)
                        .orElseThrow(() -> SystemException.notFound("PROVIDER_NOT_FOUND"));
        provider.setVerificationStatus(request.status());
        provider.setReviewNote(trimOrNull(request.reviewNote()));
        if (request.commissionRateOverride() != null) {
            provider.setCommissionRateOverride(request.commissionRateOverride());
        }
        if (request.status() == ProviderVerificationStatus.VERIFIED) {
            provider.setVerifiedAt(LocalDateTime.now());
            provider.setVerifiedBy(adminUsername);
            List<ProviderDocument> docs =
                    documents.findByProviderIdOrderByCreatedAtDesc(provider.getId());
            for (ProviderDocument doc : docs) {
                if (doc.getStatus() == ProviderDocumentStatus.PENDING) {
                    doc.setStatus(ProviderDocumentStatus.APPROVED);
                    documents.save(doc);
                }
            }
            if (wallets.findByProviderId(provider.getId()).isEmpty()) {
                ProviderWallet wallet = new ProviderWallet();
                wallet.setProvider(provider);
                wallets.save(wallet);
            }
        } else if (request.status() == ProviderVerificationStatus.SUSPENDED) {
            for (MarketplaceListing l :
                    listings.findByProviderIdOrderByCreatedAtDesc(provider.getId())) {
                if (l.getModerationStatus() == ListingModerationStatus.PUBLISHED) {
                    l.setModerationStatus(ListingModerationStatus.PAUSED);
                    listings.save(l);
                }
            }
        }
        ProviderProfile saved = providers.save(provider);
        recordAudit(
                adminUsername,
                "PROVIDER_PROFILE",
                saved.getId().toString(),
                request.status().name());
        notifyProvider(
                saved,
                "Cập nhật hồ sơ Đối tác KYC",
                "Trạng thái hồ sơ " + saved.getDisplayName() + ": " + request.status().name(),
                com.uav.platform.enums.notification.NotificationType.SYSTEM,
                "PROVIDER",
                saved.getId());
        return mapper.toProfileResponse(
                saved, documents.findByProviderIdOrderByCreatedAtDesc(saved.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MarketplaceListingResponse> listListings(
            ListingModerationStatus status, String keyword, Pageable pageable) {
        Specification<MarketplaceListing> spec =
                Specification.allOf(listingModerationStatus(status), listingKeyword(keyword));
        Pageable sorted =
                PageRequest.of(
                        pageable.getPageNumber(),
                        Math.min(Math.max(pageable.getPageSize(), 1), 50),
                        Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id")));
        return PageResponse.from(listings.findAll(spec, sorted), mapper::toListingResponse);
    }

    @Override
    public MarketplaceListingResponse moderateListing(
            Long listingId, ListingModerationRequest request, String adminUsername) {
        MarketplaceListing listing =
                listings.findWithDetailsById(listingId)
                        .orElseThrow(() -> SystemException.notFound("LISTING_NOT_FOUND"));
        if (request.status() == ListingModerationStatus.PUBLISHED
                && listing.getProvider() != null
                && listing.getProvider().getVerificationStatus()
                        != ProviderVerificationStatus.VERIFIED) {
            throw SystemException.conflict(
                    "Đối tác sở hữu tin đăng chưa được xác minh KYC (VERIFIED). Vui lòng duyệt hồ sơ Đối tác trước.",
                    "PROVIDER_NOT_VERIFIED");
        }
        listing.setModerationStatus(request.status());
        listing.setModerationNote(trimOrNull(request.moderationNote()));
        listing.setModeratedBy(adminUsername);
        listing.setModeratedAt(LocalDateTime.now());
        if (request.featured() != null) {
            listing.setFeatured(request.featured());
        }
        MarketplaceListing saved = listings.save(listing);
        recordAudit(
                adminUsername,
                "MARKETPLACE_LISTING",
                saved.getId().toString(),
                request.status().name());
        notifyProvider(
                saved.getProvider(),
                "Kiểm duyệt gói dịch vụ: " + saved.getTitle(),
                "Trạng thái mới: " + request.status().name(),
                com.uav.platform.enums.notification.NotificationType.SYSTEM,
                "LISTING",
                saved.getId());
        return mapper.toListingResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProviderPayoutResponse> listPayouts(
            PayoutStatus status, Pageable pageable) {
        Specification<ProviderPayout> spec = Specification.allOf(payoutStatus(status));
        Pageable sorted =
                PageRequest.of(
                        pageable.getPageNumber(),
                        Math.min(Math.max(pageable.getPageSize(), 1), 50),
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return PageResponse.from(payouts.findAll(spec, sorted), mapper::toPayoutResponse);
    }

    @Override
    public ProviderPayoutResponse processPayout(
            Long payoutId, PayoutProcessRequest request, String adminUsername) {
        ProviderPayout payout =
                payouts.findByIdForUpdate(payoutId)
                        .orElseThrow(() -> SystemException.notFound("PAYOUT_NOT_FOUND"));
        if (payout.getStatus() != PayoutStatus.PENDING) {
            throw SystemException.conflict(
                    "Lệnh rút tiền đã được xử lý trước đó.", "PAYOUT_ALREADY_PROCESSED");
        }
        ProviderWallet wallet =
                wallets.findByProviderIdForUpdate(payout.getProvider().getId())
                        .orElseThrow(() -> SystemException.notFound("WALLET_NOT_FOUND"));

        BigDecimal amount = payout.getAmountVnd();
        BigDecimal nextPending = wallet.getPendingPayoutVnd().subtract(amount);
        wallet.setPendingPayoutVnd(nextPending.signum() < 0 ? BigDecimal.ZERO : nextPending);

        payout.setAdminNote(trimOrNull(request.adminNote()));
        payout.setProcessedBy(adminUsername);
        payout.setProcessedAt(LocalDateTime.now());

        WalletTransaction tx = new WalletTransaction();
        tx.setWallet(wallet);
        tx.setPayout(payout);
        tx.setGrossAmountVnd(amount);
        tx.setFeeAmountVnd(BigDecimal.ZERO);

        if (request.approve()) {
            if (request.bankTransferRef() == null || request.bankTransferRef().isBlank()) {
                throw SystemException.badRequest(
                                "Nhập mã giao dịch ngân hàng (UNC) khi xác nhận đã chuyển khoản.")
                        .at("bankTransferRef");
            }
            payout.setStatus(PayoutStatus.PAID);
            payout.setBankTransferRef(request.bankTransferRef().trim());
            wallet.setTotalWithdrawnVnd(wallet.getTotalWithdrawnVnd().add(amount));

            tx.setTransactionType(WalletTransactionType.PAYOUT_COMPLETED);
            tx.setNetAmountVnd(BigDecimal.ZERO);
            tx.setBalanceAfterVnd(wallet.getAvailableBalanceVnd());
            tx.setDescription(
                    "Đã giải ngân rút tiền "
                            + payout.getCode()
                            + " (UNC: "
                            + payout.getBankTransferRef()
                            + ")");
        } else {
            payout.setStatus(PayoutStatus.REJECTED);
            wallet.setAvailableBalanceVnd(wallet.getAvailableBalanceVnd().add(amount));

            tx.setTransactionType(WalletTransactionType.PAYOUT_REJECTED);
            tx.setNetAmountVnd(amount);
            tx.setBalanceAfterVnd(wallet.getAvailableBalanceVnd());
            tx.setDescription("Hoàn số dư do từ chối lệnh rút tiền " + payout.getCode());
        }

        wallets.save(wallet);
        ProviderPayout saved = payouts.save(payout);
        ledger.save(tx);
        recordAudit(
                adminUsername,
                "PROVIDER_PAYOUT",
                saved.getId().toString(),
                saved.getStatus().name());
        notifyProvider(
                saved.getProvider(),
                request.approve()
                        ? "Đã giải ngân lệnh rút " + saved.getCode()
                        : "Từ chối lệnh rút " + saved.getCode(),
                request.approve()
                        ? "Khoản rút tiền đã được chuyển khoản (UNC: "
                                + saved.getBankTransferRef()
                                + ")."
                        : "Số dư đã hoàn lại vào Ví khả dụng.",
                com.uav.platform.enums.notification.NotificationType.PAYMENT,
                "PAYOUT",
                saved.getId());
        return mapper.toPayoutResponse(saved);
    }

    private void recordAudit(String username, String resource, String resourceId, String detail) {
        Long actorId = users.findByUsername(username).map(u -> u.getId()).orElse(null);
        audit.record(actorId, username, AuditAction.UPDATE, resource, resourceId, detail);
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
