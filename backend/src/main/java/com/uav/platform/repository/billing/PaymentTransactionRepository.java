package com.uav.platform.repository.billing;

import com.uav.platform.entity.billing.PaymentTransaction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentTransactionRepository
        extends JpaRepository<PaymentTransaction, Long>,
                JpaSpecificationExecutor<PaymentTransaction> {

    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findByInvoiceId(Long invoiceId);

    /** Admin listing loads invoice and customer in the same query to avoid N+1 lookups. */
    @Override
    @EntityGraph(attributePaths = {"invoice", "user"})
    Page<PaymentTransaction> findAll(Specification<PaymentTransaction> spec, Pageable pageable);
}
