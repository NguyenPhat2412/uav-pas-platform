package com.uav.platform.modules.billing.repository;

import com.uav.platform.modules.billing.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
    Optional<Invoice> findByCode(String code);
    Page<Invoice> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    List<Invoice> findByUserId(Long userId);
}
