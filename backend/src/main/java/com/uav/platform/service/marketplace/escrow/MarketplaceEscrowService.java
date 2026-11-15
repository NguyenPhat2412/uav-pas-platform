package com.uav.platform.service.marketplace.escrow;

import java.math.BigDecimal;

public interface MarketplaceEscrowService {

    BigDecimal effectivePlatformFeeRate(Long providerId);

    void issueOrSyncEscrowInvoiceForMission(Long missionId);

    void onInvoicePaid(Long invoiceId);

    void onMissionReviewed(Long missionId);

    void onMissionCancelledOrFailed(Long missionId, String reason);

    boolean hasReleasedEscrow(Long missionId);
}
