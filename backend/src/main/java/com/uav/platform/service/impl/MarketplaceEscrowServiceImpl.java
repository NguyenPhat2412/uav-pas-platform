package com.uav.platform.service.impl;

import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionReviewDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IProviderWalletDao;
import com.uav.platform.dao.IWalletTransactionDao;
import com.uav.platform.entity.Invoice;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionReview;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.entity.ProviderWallet;
import com.uav.platform.entity.WalletTransaction;
import com.uav.platform.enums.EscrowStatus;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.enums.WalletTransactionType;
import com.uav.platform.service.MarketplaceEscrowService;
import com.uav.platform.service.SystemConfigService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class MarketplaceEscrowServiceImpl implements MarketplaceEscrowService {

    public static final String PLATFORM_FEE_RATE_KEY = "marketplace.platform_fee_rate";
    private static final BigDecimal DEFAULT_FEE_RATE = new BigDecimal("0.10");

    private final IProviderProfileDao providers;
    private final IMarketplaceListingDao listings;
    private final IProviderWalletDao wallets;
    private final IWalletTransactionDao ledger;
    private final IInvoiceDao invoices;
    private final IMissionDao missions;
    private final IMissionReviewDao reviews;
    private final SystemConfigService systemConfig;

    @Autowired(required = false)
    private org.springframework.beans.factory.ObjectProvider<
                    com.uav.platform.service.NotificationService>
            notifications;

    @Autowired(required = false)
    private com.uav.platform.service.FinancialOutboxService financialEvents;

    private void notifyProvider(
            ProviderProfile provider, String title, String content, String refType, Long refId) {
        if (provider == null
                || provider.getUser() == null
                || provider.getUser().getId() == null
                || notifications == null) return;
        var svc = notifications.getIfAvailable();
        if (svc == null) return;
        try {
            svc.sendNotification(
                    new com.uav.platform.dto.request.CreateNotificationRequest(
                            provider.getUser().getId(),
                            title,
                            content,
                            com.uav.platform.enums.NotificationType.PAYMENT,
                            refType,
                            refId));
        } catch (RuntimeException ignored) {
            // Best-effort realtime notification.
        }
    }

    @Autowired
    public MarketplaceEscrowServiceImpl(
            IProviderProfileDao providers,
            IMarketplaceListingDao listings,
            IProviderWalletDao wallets,
            IWalletTransactionDao ledger,
            IInvoiceDao invoices,
            IMissionDao missions,
            IMissionReviewDao reviews,
            @Autowired(required = false) SystemConfigService systemConfig) {
        this.providers = providers;
        this.listings = listings;
        this.wallets = wallets;
        this.ledger = ledger;
        this.invoices = invoices;
        this.missions = missions;
        this.reviews = reviews;
        this.systemConfig = systemConfig;
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal effectivePlatformFeeRate(Long providerId) {
        if (providerId != null) {
            var override =
                    providers
                            .findById(providerId)
                            .map(ProviderProfile::getCommissionRateOverride)
                            .orElse(null);
            if (override != null && override.signum() >= 0) {
                return override;
            }
        }
        if (systemConfig != null) {
            try {
                BigDecimal configured =
                        new BigDecimal(
                                systemConfig.valueOrDefault(PLATFORM_FEE_RATE_KEY, "0.10").trim());
                if (configured.signum() >= 0 && configured.compareTo(new BigDecimal("0.50")) <= 0) {
                    return configured;
                }
            } catch (NumberFormatException ignored) {
                // Fall back to default rate.
            }
        }
        return DEFAULT_FEE_RATE;
    }

    @Override
    public void issueOrSyncEscrowInvoiceForMission(Long missionId) {
        Mission mission = missions.findById(missionId).orElse(null);
        if (mission == null || mission.getQuotedSubtotalVnd() == null) return;
        BigDecimal charge = mission.getQuotedSubtotalVnd().setScale(0, RoundingMode.HALF_UP);
        if (charge.signum() <= 0) return;

        List<Invoice> existing = invoices.findByMissionIdOrderByIdDesc(missionId);
        boolean hasOpenOrPaid =
                existing.stream()
                        .anyMatch(
                                inv ->
                                        inv.getStatus() == InvoiceStatus.PENDING
                                                || inv.getStatus() == InvoiceStatus.PAID);
        if (hasOpenOrPaid) return;

        String code = "INV-MKT-" + missionId + (existing.isEmpty() ? "" : "-R" + existing.size());
        String note =
                "Thanh toán tạm giữ (Escrow) cho nhiệm vụ "
                        + mission.getCode()
                        + (mission.getListing() != null
                                ? " — " + mission.getListing().getTitle()
                                : "");
        if (mission.getSecurityDepositVnd() != null
                && mission.getSecurityDepositVnd().signum() > 0) {
            note +=
                    " (Yêu cầu đặt cọc thiết bị: "
                            + mission.getSecurityDepositVnd().setScale(0, RoundingMode.HALF_UP)
                            + " VNĐ)";
        }
        if (note.length() > 500) note = note.substring(0, 500);

        int dueDays =
                com.uav.platform.service.impl.SystemConfigurationOperations.intOrDefault(
                        systemConfig, "billing.invoice_due_days", 7);
        Invoice invoice =
                new Invoice(
                        code,
                        mission.getCustomer(),
                        mission,
                        null,
                        charge,
                        LocalDateTime.now().plusDays(Math.max(1, dueDays)),
                        note);

        if (mission.getProvider() != null) {
            BigDecimal rate = effectivePlatformFeeRate(mission.getProvider().getId());
            BigDecimal fee = charge.multiply(rate).setScale(0, RoundingMode.HALF_UP);
            BigDecimal net = charge.subtract(fee);
            invoice.setProvider(mission.getProvider());
            invoice.setEscrowStatus(EscrowStatus.UNFUNDED);
            invoice.setPlatformFeeRate(rate);
            invoice.setPlatformFeeVnd(fee);
            invoice.setProviderNetVnd(net);
        } else {
            invoice.setEscrowStatus(EscrowStatus.NONE);
        }

        Invoice savedInvoice = invoices.save(invoice);
        if (financialEvents != null) {
            financialEvents.recordInvoiceIssued(savedInvoice);
        }
        mission.setBillingStatus("ISSUED");
        missions.save(mission);
    }

    @Override
    public void onInvoicePaid(Long invoiceId) {
        Invoice invoice = invoices.findByIdForUpdate(invoiceId).orElse(null);
        if (invoice == null
                || invoice.getStatus() != InvoiceStatus.PAID
                || invoice.getProvider() == null) {
            return;
        }
        if (invoice.getEscrowStatus() == EscrowStatus.HELD
                || invoice.getEscrowStatus() == EscrowStatus.DISPUTED
                || invoice.getEscrowStatus() == EscrowStatus.RELEASED
                || invoice.getEscrowStatus() == EscrowStatus.REFUNDED) {
            return;
        }
        Long providerId = invoice.getProvider().getId();
        ProviderWallet wallet = ensureAndLockWallet(invoice.getProvider());

        BigDecimal gross = invoice.getAmount().setScale(0, RoundingMode.HALF_UP);
        BigDecimal rate =
                invoice.getPlatformFeeRate() != null
                        ? invoice.getPlatformFeeRate()
                        : effectivePlatformFeeRate(providerId);
        BigDecimal fee =
                invoice.getPlatformFeeVnd() != null
                        ? invoice.getPlatformFeeVnd()
                        : gross.multiply(rate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal net =
                invoice.getProviderNetVnd() != null
                        ? invoice.getProviderNetVnd()
                        : gross.subtract(fee);

        invoice.setPlatformFeeRate(rate);
        invoice.setPlatformFeeVnd(fee);
        invoice.setProviderNetVnd(net);
        invoice.setEscrowStatus(EscrowStatus.HELD);
        invoices.save(invoice);

        wallet.setEscrowHeldVnd(wallet.getEscrowHeldVnd().add(net));
        wallets.save(wallet);

        WalletTransaction holdTx = new WalletTransaction();
        holdTx.setWallet(wallet);
        holdTx.setInvoice(invoice);
        holdTx.setTransactionType(WalletTransactionType.ESCROW_HOLD);
        holdTx.setGrossAmountVnd(gross);
        holdTx.setFeeAmountVnd(fee);
        holdTx.setNetAmountVnd(net);
        holdTx.setBalanceAfterVnd(wallet.getAvailableBalanceVnd());
        holdTx.setDescription("Tạm giữ Escrow từ hóa đơn " + invoice.getCode());
        ledger.save(holdTx);
        notifyProvider(
                invoice.getProvider(),
                "Khách đã nạp Ký quỹ " + invoice.getCode(),
                "Khoản Ký quỹ cho đơn hàng đã được xác nhận thanh toán.",
                "INVOICE",
                invoice.getId());

        if (invoice.getMission() != null) {
            reviews.findByMissionId(invoice.getMission().getId())
                    .ifPresent(
                            r -> {
                                if (r.isDeliverablesAccepted()) {
                                    releaseHeldEscrow(invoice, wallet);
                                } else {
                                    invoice.setEscrowStatus(EscrowStatus.DISPUTED);
                                    invoices.save(invoice);
                                }
                            });
        }
    }

    @Override
    public void onMissionReviewed(Long missionId) {
        Mission mission = missions.findById(missionId).orElse(null);
        if (mission == null) return;

        if (mission.getListing() != null) {
            refreshListingRating(mission.getListing());
        }
        if (mission.getProvider() != null) {
            refreshProviderRating(mission.getProvider());
        }

        MissionReview review = reviews.findByMissionId(missionId).orElse(null);
        if (review == null || mission.getProvider() == null) {
            return;
        }

        List<Invoice> paidInvoices =
                invoices.findByMissionIdAndStatus(missionId, InvoiceStatus.PAID);
        for (Invoice item : paidInvoices) {
            Invoice invoice = invoices.findByIdForUpdate(item.getId()).orElse(null);
            if (invoice == null || invoice.getProvider() == null) continue;
            if (review.isDeliverablesAccepted()) {
                if (invoice.getEscrowStatus() == EscrowStatus.HELD
                        || invoice.getEscrowStatus() == EscrowStatus.DISPUTED) {
                    ProviderWallet wallet = ensureAndLockWallet(invoice.getProvider());
                    releaseHeldEscrow(invoice, wallet);
                    notifyProvider(
                            invoice.getProvider(),
                            "Đã giải ngân Ký quỹ " + invoice.getCode(),
                            "Khách hàng đã nghiệm thu — doanh thu đã cộng vào Ví đối tác.",
                            "MISSION",
                            missionId);
                }
            } else if (invoice.getEscrowStatus() == EscrowStatus.HELD) {
                invoice.setEscrowStatus(EscrowStatus.DISPUTED);
                invoices.save(invoice);
                notifyProvider(
                        invoice.getProvider(),
                        "Tạm khóa Ký quỹ " + invoice.getCode(),
                        "Khách hàng yêu cầu bổ sung dữ liệu bàn giao.",
                        "MISSION",
                        missionId);
            }
        }
    }

    @Override
    public void onMissionCancelledOrFailed(Long missionId, String reason) {
        if (missionId == null) return;
        Mission mission = missions.findById(missionId).orElse(null);
        String detail = (reason == null || reason.isBlank()) ? "Đơn kết thúc sớm" : reason.trim();

        for (Invoice open : invoices.findByMissionIdAndStatus(missionId, InvoiceStatus.PENDING)) {
            Invoice locked = invoices.findByIdForUpdate(open.getId()).orElse(null);
            if (locked == null || locked.getStatus() != InvoiceStatus.PENDING) continue;
            locked.setStatus(InvoiceStatus.CANCELLED);
            locked.setNotes(appendNote(locked.getNotes(), "[Hủy tự động] " + detail));
            invoices.save(locked);
            if (mission != null) mission.setBillingStatus("CANCELLED");
        }

        for (Invoice paid : invoices.findByMissionIdAndStatus(missionId, InvoiceStatus.PAID)) {
            Invoice locked = invoices.findByIdForUpdate(paid.getId()).orElse(null);
            if (locked == null || locked.getProvider() == null) continue;
            if (locked.getEscrowStatus() != EscrowStatus.HELD
                    && locked.getEscrowStatus() != EscrowStatus.DISPUTED) {
                continue;
            }
            ProviderWallet wallet = ensureAndLockWallet(locked.getProvider());
            BigDecimal net =
                    locked.getProviderNetVnd() != null
                            ? locked.getProviderNetVnd()
                            : BigDecimal.ZERO;
            BigDecimal newHeld = wallet.getEscrowHeldVnd().subtract(net);
            wallet.setEscrowHeldVnd(newHeld.signum() < 0 ? BigDecimal.ZERO : newHeld);
            wallets.save(wallet);

            locked.setEscrowStatus(EscrowStatus.REFUNDED);
            locked.setNotes(appendNote(locked.getNotes(), "[Hoàn trả Escrow] " + detail));
            invoices.save(locked);

            String missionCode = mission != null ? mission.getCode() : locked.getCode();
            WalletTransaction refundTx = new WalletTransaction();
            refundTx.setWallet(wallet);
            refundTx.setInvoice(locked);
            refundTx.setTransactionType(WalletTransactionType.ESCROW_REFUND);
            refundTx.setGrossAmountVnd(locked.getAmount());
            refundTx.setFeeAmountVnd(BigDecimal.ZERO);
            refundTx.setNetAmountVnd(net.negate());
            refundTx.setBalanceAfterVnd(wallet.getAvailableBalanceVnd());
            refundTx.setDescription("Hoàn tạm giữ Escrow cho khách hàng (" + missionCode + ")");
            ledger.save(refundTx);

            if (mission != null) mission.setBillingStatus("REFUNDED");
        }
        if (mission != null) {
            missions.save(mission);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasReleasedEscrow(Long missionId) {
        if (missionId == null) return false;
        return invoices.findByMissionIdAndStatus(missionId, InvoiceStatus.PAID).stream()
                .anyMatch(inv -> inv.getEscrowStatus() == EscrowStatus.RELEASED);
    }

    private void releaseHeldEscrow(Invoice invoice, ProviderWallet wallet) {
        if (invoice.getEscrowStatus() != EscrowStatus.HELD
                && invoice.getEscrowStatus() != EscrowStatus.DISPUTED) return;
        BigDecimal net =
                invoice.getProviderNetVnd() != null ? invoice.getProviderNetVnd() : BigDecimal.ZERO;
        BigDecimal fee =
                invoice.getPlatformFeeVnd() != null ? invoice.getPlatformFeeVnd() : BigDecimal.ZERO;
        BigDecimal newHeld = wallet.getEscrowHeldVnd().subtract(net);
        wallet.setEscrowHeldVnd(newHeld.signum() < 0 ? BigDecimal.ZERO : newHeld);
        wallet.setAvailableBalanceVnd(wallet.getAvailableBalanceVnd().add(net));
        wallet.setTotalEarnedVnd(wallet.getTotalEarnedVnd().add(net));
        wallets.save(wallet);

        invoice.setEscrowStatus(EscrowStatus.RELEASED);
        invoice.setEscrowReleasedAt(LocalDateTime.now());
        invoices.save(invoice);

        String missionCode =
                invoice.getMission() != null ? invoice.getMission().getCode() : invoice.getCode();
        WalletTransaction releaseTx = new WalletTransaction();
        releaseTx.setWallet(wallet);
        releaseTx.setInvoice(invoice);
        releaseTx.setTransactionType(WalletTransactionType.ESCROW_RELEASE);
        releaseTx.setGrossAmountVnd(invoice.getAmount());
        releaseTx.setFeeAmountVnd(fee);
        releaseTx.setNetAmountVnd(net);
        releaseTx.setBalanceAfterVnd(wallet.getAvailableBalanceVnd());
        releaseTx.setDescription("Giải ngân nghiệm thu " + missionCode + " (trừ phí sàn)");
        ledger.save(releaseTx);
    }

    public ProviderWallet ensureAndLockWallet(ProviderProfile provider) {
        if (wallets.findByProviderId(provider.getId()).isEmpty()) {
            ProviderWallet created = new ProviderWallet();
            created.setProvider(provider);
            wallets.saveAndFlush(created);
        }
        return wallets.findByProviderIdForUpdate(provider.getId()).orElseThrow();
    }

    private void refreshListingRating(MarketplaceListing listing) {
        List<MissionReview> items = reviews.findByMissionListingId(listing.getId());
        var rated =
                items.stream()
                        .filter(r -> r.getOverallRating() != null)
                        .mapToInt(MissionReview::getOverallRating)
                        .toArray();
        listing.setReviewCount(rated.length);
        if (rated.length == 0) {
            listing.setRatingAvg(BigDecimal.ZERO);
        } else {
            double avg = java.util.Arrays.stream(rated).average().orElse(0.0);
            listing.setRatingAvg(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        }
        listings.save(listing);
    }

    private void refreshProviderRating(ProviderProfile provider) {
        List<MissionReview> items = reviews.findByMissionProviderId(provider.getId());
        var rated =
                items.stream()
                        .filter(r -> r.getOverallRating() != null)
                        .mapToInt(MissionReview::getOverallRating)
                        .toArray();
        provider.setReviewCount(rated.length);
        if (rated.length == 0) {
            provider.setRatingAvg(BigDecimal.ZERO);
        } else {
            double avg = java.util.Arrays.stream(rated).average().orElse(0.0);
            provider.setRatingAvg(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        }
        providers.save(provider);
    }

    private static String appendNote(String existing, String extra) {
        String joined = (existing == null || existing.isBlank() ? "" : existing + " ") + extra;
        return joined.length() > 500 ? joined.substring(0, 500) : joined;
    }
}
