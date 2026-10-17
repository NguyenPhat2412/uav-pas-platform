package com.uav.platform.modules.billing.service;

import static org.mockito.Mockito.*;

import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.service.MissionBillingService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

class MissionBillingPolicyTest {
    @Test
    void completionRecordsUsageAndQueuesInvoiceWithoutIssuingItInline() {
        QuotaService quotas = mock(QuotaService.class);
        MissionInvoiceService invoiceJobs = mock(MissionInvoiceService.class);
        MissionBillingService service = new MissionBillingService(quotas, invoiceJobs);
        var owner = new AppUser("owner", "a@example.test", "hash", null, UserStatus.ACTIVE);
        owner.setId(1L);
        var start = LocalDateTime.of(2026, 10, 17, 10, 0);
        var mission =
                Mission.draft(
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
