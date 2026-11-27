package com.uav.platform.service;

import static org.mockito.Mockito.*;

import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.MissionPriority;
import com.uav.platform.enums.MissionType;
import com.uav.platform.enums.UserStatus;
import com.uav.platform.service.impl.MissionBillingServiceImpl;
import com.uav.platform.service.impl.MissionOperations;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

class MissionBillingPolicyTest {
    @Test
    void completionRecordsUsageAndQueuesInvoiceWithoutIssuingItInline() {
        QuotaService quotas = mock(QuotaService.class);
        MissionInvoiceService invoiceJobs = mock(MissionInvoiceService.class);
        MissionBillingService service = new MissionBillingServiceImpl(quotas, invoiceJobs);
        var owner = new AppUser("owner", "a@example.test", "hash", null, UserStatus.ACTIVE);
        owner.setId(1L);
        var start = LocalDateTime.of(2026, 10, 17, 10, 0);
        var mission =
                MissionOperations.draft(
                        owner,
                        MissionType.OTHER,
                        "Mission",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusHours(2),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setId(1L);
        service.recordCompletion(mission);
        verify(quotas).recordMissionUsage(1L, 2.0);
        verify(invoiceJobs).enqueue(mission, 2.0);
        verifyNoMoreInteractions(quotas, invoiceJobs);
    }
}
