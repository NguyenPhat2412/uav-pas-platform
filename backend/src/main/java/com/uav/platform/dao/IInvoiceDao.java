package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.Invoice;
import com.uav.platform.enums.InvoiceStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface IInvoiceDao extends IGenericDao<Long, Invoice> {
    Optional<Invoice> findByIdForUpdate(Long id);

    Optional<Invoice> findByCode(String code);

    Optional<Invoice> findByNormalizedCode(String normalizedCode);

    Page<Invoice> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Invoice> findByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, InvoiceStatus status);

    long countByUserId(Long userId);

    boolean existsByMissionIdAndStatusIn(
            Long missionId, java.util.Collection<InvoiceStatus> statuses);

    List<Invoice> findByMissionIdAndStatus(Long missionId, InvoiceStatus status);

    List<Invoice> findByMissionIdOrderByIdDesc(Long missionId);

    List<Invoice> findByStatusAndDueDateBeforeAndMissionIsNull(
            InvoiceStatus status, LocalDateTime dueBefore);

    List<Invoice> findForStatistics(LocalDateTime from, LocalDateTime to, InvoiceStatus pending);

    List<Object[]> totalsByPlan(
            InvoiceStatus pending,
            InvoiceStatus paid,
            LocalDateTime now,
            LocalDateTime lastMonth,
            LocalDateTime month,
            LocalDateTime nextMonth);

    List<Object[]> paidByMonthAndPlan(InvoiceStatus paid, LocalDateTime from, LocalDateTime to);

    List<Object[]> firstPlanPaymentsByMonth(
            InvoiceStatus paid, LocalDateTime from, LocalDateTime to);
}
