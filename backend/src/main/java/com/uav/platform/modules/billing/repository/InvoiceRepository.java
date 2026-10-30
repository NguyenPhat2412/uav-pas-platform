package com.uav.platform.modules.billing.repository;

import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.enums.InvoiceStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository
        extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
    Optional<Invoice> findByCode(String code);

    Page<Invoice> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Invoice> findByUserId(Long userId);

    /**
     * One row per plan id; mission invoices count under null even when they carry the customer's
     * plan, so plan rows hold subscriptions only. Columns: pending
     * count and amount, overdue (pending past due) count and amount, paid this month, paid last
     * month and paid in total. Months are [lastMonth, month) and [month, nextMonth) by paidAt.
     */
    @Query(
            "select p.id,"
                    + " sum(case when i.status = :pending then 1 else 0 end),"
                    + " sum(case when i.status = :pending then i.amount else 0 end),"
                    + " sum(case when i.status = :pending and i.dueDate < :now then 1 else 0 end),"
                    + " sum(case when i.status = :pending and i.dueDate < :now"
                    + " then i.amount else 0 end),"
                    + " sum(case when i.status = :paid and i.paidAt >= :month and i.paidAt < :nextMonth"
                    + " then i.amount else 0 end),"
                    + " sum(case when i.status = :paid and i.paidAt >= :lastMonth and i.paidAt < :month"
                    + " then i.amount else 0 end),"
                    + " sum(case when i.status = :paid then i.amount else 0 end)"
                    + " from Invoice i left join i.plan p on i.mission is null group by p.id")
    List<Object[]> totalsByPlan(
            @Param("pending") InvoiceStatus pending,
            @Param("paid") InvoiceStatus paid,
            @Param("now") LocalDateTime now,
            @Param("lastMonth") LocalDateTime lastMonth,
            @Param("month") LocalDateTime month,
            @Param("nextMonth") LocalDateTime nextMonth);

    /** Paid amount per calendar month and plan code (null code = mission or other invoice) in [from, to). */
    @Query(
            "select extract(year from i.paidAt), extract(month from i.paidAt), p.code, sum(i.amount)"
                    + " from Invoice i left join i.plan p on i.mission is null"
                    + " where i.status = :paid and i.paidAt >= :from and i.paidAt < :to"
                    + " group by extract(year from i.paidAt), extract(month from i.paidAt), p.code")
    List<Object[]> paidByMonthAndPlan(
            @Param("paid") InvoiceStatus paid,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    /** Customers per calendar month whose first ever paid plan invoice was paid then, in [from, to). */
    @Query(
            "select extract(year from i.paidAt), extract(month from i.paidAt), count(distinct i.user.id)"
                    + " from Invoice i where i.status = :paid and i.plan is not null and i.mission is null"
                    + " and i.paidAt >= :from and i.paidAt < :to"
                    + " and i.paidAt = (select min(f.paidAt) from Invoice f where f.user = i.user"
                    + " and f.status = :paid and f.plan is not null and f.mission is null)"
                    + " group by extract(year from i.paidAt), extract(month from i.paidAt)")
    List<Object[]> firstPlanPaymentsByMonth(
            @Param("paid") InvoiceStatus paid,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
