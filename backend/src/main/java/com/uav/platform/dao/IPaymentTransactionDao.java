package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.PaymentTransaction;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IPaymentTransactionDao extends IGenericDao<Long, PaymentTransaction> {
    Optional<PaymentTransaction> findByTransactionCode(String transactionCode);

    Optional<PaymentTransaction> findByInvoiceId(Long invoiceId);

    Optional<PaymentTransaction> findFirstByInvoiceIdAndStatusOrderByCompletedAtDescIdDesc(
            Long invoiceId, String status);

    List<PaymentTransaction> findForStatistics(
            LocalDateTime from, LocalDateTime to, Collection<String> review);
}
