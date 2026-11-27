package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.IMissionBillingJobDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Invoice;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionBillingJob;
import com.uav.platform.service.FinancialOutboxService;
import com.uav.platform.service.SystemConfigService;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

class MissionInvoiceServiceUnitTest {

    private PlatformTransactionManager noopTxManager() {
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        return tm;
    }

    @Test
    void enqueueProcessAndRetryCoverSuccessAndAllErrorCategories() {
        IMissionBillingJobDao jobs = mock(IMissionBillingJobDao.class);
        IInvoiceDao invoices = mock(IInvoiceDao.class);
        IMissionDao missions = mock(IMissionDao.class);
        SystemConfigService config = mock(SystemConfigService.class);
        FinancialOutboxService outbox = mock(FinancialOutboxService.class);

        MissionInvoiceServiceImpl service =
                new MissionInvoiceServiceImpl(jobs, invoices, missions, config, noopTxManager());
        ReflectionTestUtils.setField(service, "financialEvents", outbox);
        ReflectionTestUtils.setField(service, "workerEnabled", true);

        AppUser customer = new AppUser();
        customer.setId(2L);
        Mission m = new Mission();
        m.setId(10L);
        m.setCode("MSN-10");
        m.setCustomer(customer);

        // Auto-generate disabled & no marketplace quote -> skip
        when(config.valueOrDefault("billing.auto_generate_invoice", "false")).thenReturn("false");
        service.enqueue(m, 2.0);
        verify(jobs, never()).save(any());

        // Marketplace quoted price -> enqueues job
        m.setQuotedSubtotalVnd(new BigDecimal("450000"));
        when(jobs.findByMissionId(10L)).thenReturn(Optional.empty());
        when(invoices.existsByMissionIdAndStatusIn(eq(10L), any())).thenReturn(false);
        service.enqueue(m, 2.0);
        verify(jobs).save(any(MissionBillingJob.class));
        assertEquals("PENDING", m.getBillingStatus());

        // Process happy path -> issues invoice & records outbox event
        MissionBillingJob job = new MissionBillingJob(m, 2.0, new BigDecimal("450000"));
        when(jobs.missionIdForJob(1L)).thenReturn(Optional.of(10L));
        when(missions.findByIdForUpdate(10L)).thenReturn(Optional.of(m));
        when(jobs.findByIdForUpdate(1L)).thenReturn(Optional.of(job));
        when(config.valueOrDefault("billing.invoice_due_days", "7")).thenReturn("7");
        when(invoices.saveAndFlush(any(Invoice.class))).thenAnswer(inv -> inv.getArgument(0));

        service.process(1L);
        assertEquals("ISSUED", job.getStatus());
        assertEquals("ISSUED", m.getBillingStatus());
        verify(outbox).recordInvoiceIssued(any(Invoice.class));

        // Process when price not configured -> ERROR + INVOICE_PRICE_NOT_CONFIGURED
        MissionBillingJob unpriced = new MissionBillingJob(m, 2.0, null);
        when(jobs.missionIdForJob(2L)).thenReturn(Optional.of(10L));
        when(jobs.findByIdForUpdate(2L)).thenReturn(Optional.of(unpriced));
        when(config.valueOrDefault("billing.hourly_rate_vnd", "")).thenReturn("not-a-number");
        service.process(2L);
        assertEquals("ERROR", unpriced.getStatus());
        assertEquals("INVOICE_PRICE_NOT_CONFIGURED", unpriced.getLastError());

        // Process with DataIntegrityViolationException -> INVOICE_DATA_CONFLICT -> FAILED at
        // MAX_ATTEMPTS
        MissionBillingJob conflictJob = new MissionBillingJob(m, 2.0, new BigDecimal("100000"));
        conflictJob.setAttempts(MissionInvoiceServiceImpl.MAX_ATTEMPTS - 1);
        when(jobs.missionIdForJob(3L)).thenReturn(Optional.of(10L));
        when(jobs.findByIdForUpdate(3L)).thenReturn(Optional.of(conflictJob));
        when(invoices.saveAndFlush(any(Invoice.class)))
                .thenThrow(new DataIntegrityViolationException("dup"));
        service.process(3L);
        assertEquals("FAILED", conflictJob.getStatus());
        assertEquals("INVOICE_DATA_CONFLICT", conflictJob.getLastError());

        // Process with storage DataAccessException -> INVOICE_STORAGE_FAILURE
        MissionBillingJob storageJob = new MissionBillingJob(m, 2.0, new BigDecimal("100000"));
        when(jobs.missionIdForJob(4L)).thenReturn(Optional.of(10L));
        when(jobs.findByIdForUpdate(4L)).thenReturn(Optional.of(storageJob));
        when(invoices.saveAndFlush(any(Invoice.class)))
                .thenThrow(new QueryTimeoutException("timeout"));
        service.process(4L);
        assertEquals("INVOICE_STORAGE_FAILURE", storageJob.getLastError());

        // retryDue executes due jobs when enabled
        when(jobs.dueIds(any(), any())).thenReturn(List.of(99L));
        when(jobs.missionIdForJob(99L)).thenReturn(Optional.empty());
        service.retryDue();
        verify(jobs).missionIdForJob(99L);
    }
}
