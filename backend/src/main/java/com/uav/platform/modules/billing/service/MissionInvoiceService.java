package com.uav.platform.modules.billing.service;

import com.uav.platform.modules.billing.entity.*;
import com.uav.platform.modules.billing.repository.*;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.settings.service.SystemConfigService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class MissionInvoiceService {
    private static final org.slf4j.Logger LOG =
            org.slf4j.LoggerFactory.getLogger(MissionInvoiceService.class);

    @org.springframework.beans.factory.annotation.Autowired
    private com.uav.platform.modules.webhook.service.FinancialOutboxService financialEvents;

    private final MissionBillingJobRepository jobs;
    private final InvoiceRepository invoices;
    private final MissionRepository missions;
    private final SystemConfigService config;
    private final TransactionTemplate transaction;

    @Value("${app.billing.invoice-worker-enabled:true}")
    private boolean workerEnabled;

    public MissionInvoiceService(
            MissionBillingJobRepository jobs,
            InvoiceRepository invoices,
            MissionRepository missions,
            SystemConfigService config,
            PlatformTransactionManager manager) {
        this.jobs = jobs;
        this.invoices = invoices;
        this.missions = missions;
        this.config = config;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(Mission mission, double hours) {
        if (!Boolean.parseBoolean(config.valueOrDefault("billing.auto_generate_invoice", "false")))
            return;
        if (jobs.findByMissionId(mission.getId()).isPresent()) return;
        jobs.save(new MissionBillingJob(mission, hours, amount(hours)));
        mission.setBillingStatus("PENDING");
    }

    private BigDecimal amount(double hours) {
        try {
            var rate = new BigDecimal(config.valueOrDefault("billing.hourly_rate_vnd", ""));
            return rate.signum() > 0
                    ? rate.multiply(BigDecimal.valueOf(hours))
                            .setScale(2, java.math.RoundingMode.HALF_UP)
                    : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    @Scheduled(
            fixedDelayString = "${app.billing.invoice-retry-delay-ms:60000}",
            initialDelayString = "${app.billing.invoice-retry-delay-ms:60000}")
    public void retryDue() {
        if (!workerEnabled) return;
        for (Long id : jobs.dueIds(LocalDateTime.now(), PageRequest.of(0, 50))) process(id);
    }

    public void process(Long id) {
        try {
            transaction.executeWithoutResult(
                    tx -> {
                        var missionId = jobs.missionIdForJob(id).orElse(null);
                        if (missionId == null) return;
                        // Completion also locks mission first, then writes its unique billing job.
                        var mission = missions.findByIdForUpdate(missionId).orElseThrow();
                        var job = jobs.findByIdForUpdate(id).orElseThrow();
                        if ("ISSUED".equals(job.getStatus())) return;
                        var charge =
                                job.getAmount() != null
                                        ? job.getAmount()
                                        : amount(job.getPlannedHours());
                        if (charge == null) throw new InvoicePriceNotConfigured();
                        var invoice =
                                new Invoice(
                                        "INV-MISSION-" + mission.getId(),
                                        mission.getCustomer(),
                                        mission,
                                        null,
                                        charge,
                                        LocalDateTime.now().plusDays(7),
                                        "Hóa đơn cho "
                                                + job.getPlannedHours()
                                                + " giờ dự kiến theo lịch: "
                                                + mission.getCode());
                        invoices.saveAndFlush(invoice);
                        financialEvents.recordInvoiceIssued(invoice);
                        job.setAmount(charge);
                        job.setInvoice(invoice);
                        job.setStatus("ISSUED");
                        job.setLastError(null);
                        job.setAttempts(job.getAttempts() + 1);
                        mission.setBillingStatus("ISSUED");
                    });
        } catch (RuntimeException error) {
            String category = errorCategory(error);
            transaction.executeWithoutResult(
                    tx -> {
                        var missionId = jobs.missionIdForJob(id).orElse(null);
                        if (missionId == null) return;
                        var mission = missions.findByIdForUpdate(missionId).orElseThrow();
                        var job = jobs.findByIdForUpdate(id).orElseThrow();
                        if ("ISSUED".equals(job.getStatus())) return;
                        job.setStatus("ERROR");
                        job.setLastError(category);
                        job.setAttempts(job.getAttempts() + 1);
                        job.setNextAttemptAt(LocalDateTime.now().plusMinutes(1));
                        mission.setBillingStatus("ERROR");
                        // Never log a provider payload, customer content, raw exception or SQL
                        // message.
                        LOG.warn(
                                "Invoice retry failed: jobId={}, missionId={}, category={}",
                                id,
                                missionId,
                                category);
                    });
        }
    }

    private static final class InvoicePriceNotConfigured extends RuntimeException {}

    private String errorCategory(RuntimeException error) {
        boolean storageFailure = false;
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof InvoicePriceNotConfigured) return "INVOICE_PRICE_NOT_CONFIGURED";
            if (cause instanceof org.springframework.dao.DataIntegrityViolationException
                    || cause instanceof jakarta.persistence.EntityNotFoundException
                    || (cause instanceof java.sql.SQLException sql
                            && sql.getSQLState() != null
                            && sql.getSQLState().startsWith("23"))) {
                return "INVOICE_DATA_CONFLICT";
            }
            if (cause instanceof org.springframework.dao.DataAccessException
                    || cause instanceof org.springframework.transaction.TransactionException
                    || cause instanceof java.sql.SQLException) storageFailure = true;
        }
        return storageFailure ? "INVOICE_STORAGE_FAILURE" : "INVOICE_PROCESSING_FAILURE";
    }
}
