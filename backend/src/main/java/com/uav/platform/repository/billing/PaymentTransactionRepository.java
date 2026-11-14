package com.uav.platform.repository.billing;

import com.uav.platform.entity.billing.PaymentTransaction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository
        extends JpaRepository<PaymentTransaction, Long>,
                JpaSpecificationExecutor<PaymentTransaction> {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findByInvoiceId(Long invoiceId);

    Optional<PaymentTransaction> findFirstByInvoiceIdAndStatusOrderByCompletedAtDescIdDesc(
            Long invoiceId, String status);

    /** Admin listing loads invoice and customer in the same query to avoid N+1 lookups. */
    @Override
    @EntityGraph(attributePaths = {"invoice", "user"})
    Page<PaymentTransaction> findAll(Specification<PaymentTransaction> spec, Pageable pageable);

    /** Transfers settled, received or refunded in [from, to), plus every one still awaiting review. */
    @org.springframework.data.jpa.repository.Query(
            "select t from PaymentTransaction t"
                    + " where (t.completedAt >= :from and t.completedAt < :to)"
                    + " or (t.createdAt >= :from and t.createdAt < :to)"
                    + " or (t.resolvedAt >= :from and t.resolvedAt < :to)"
                    + " or (t.status in :review and t.resolution is null)")
    List<PaymentTransaction> findForStatistics(
            @org.springframework.data.repository.query.Param("from") LocalDateTime from,
            @org.springframework.data.repository.query.Param("to") LocalDateTime to,
            @org.springframework.data.repository.query.Param("review") Collection<String> review);
}
