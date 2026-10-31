package com.uav.platform.service.billing;

import static org.mockito.Mockito.*;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.service.impl.mission.MissionBillingServiceImpl;
import com.uav.platform.service.impl.mission.MissionOperations;
import com.uav.platform.service.mission.MissionBillingService;

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
