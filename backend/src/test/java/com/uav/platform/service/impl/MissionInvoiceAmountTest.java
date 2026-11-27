package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMissionBillingJobDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionBillingJob;
import com.uav.platform.service.SystemConfigService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Optional;

class MissionInvoiceAmountTest {
    @Test
    void missionChargeIsRoundedHalfUpToWholeDong() {
        var jobs = mock(IMissionBillingJobDao.class);
        var config = mock(SystemConfigService.class);
        when(config.valueOrDefault("billing.auto_generate_invoice", "false")).thenReturn("true");
        when(config.valueOrDefault("billing.hourly_rate_vnd", "")).thenReturn("333");
        when(jobs.findByMissionId(7L)).thenReturn(Optional.empty());
        var service =
                new MissionInvoiceServiceImpl(
                        jobs,
                        mock(IInvoiceDao.class),
                        mock(IMissionDao.class),
                        config,
                        mock(org.springframework.transaction.PlatformTransactionManager.class));
        Mission mission = new Mission();
        mission.setId(7L);

        service.enqueue(mission, 1.5); // 333 x 1.5 = 499.5 đồng

        var job = ArgumentCaptor.forClass(MissionBillingJob.class);
        verify(jobs).save(job.capture());
        assertEquals(new BigDecimal("500"), job.getValue().getAmount());
        assertEquals(0, job.getValue().getAmount().scale());
    }
}
