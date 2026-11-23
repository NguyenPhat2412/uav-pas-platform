package com.uav.platform.dao.impl.billing;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.billing.IPaymentTransactionDao;
import com.uav.platform.entity.billing.PaymentTransaction;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class PaymentTransactionDaoImpl extends HibernateGenericDao<Long, PaymentTransaction>
        implements IPaymentTransactionDao {

    private static final Logger logger = LoggerFactory.getLogger(PaymentTransactionDaoImpl.class);

    public PaymentTransactionDaoImpl(final EntityManager entityManager) {
        super(PaymentTransaction.class, entityManager);
    }

    @Override
    public Optional<PaymentTransaction> findByTransactionCode(String transactionCode) {
        return hql("select e from PaymentTransaction e where e.transactionCode = :transactionCode")
                .setParameter("transactionCode", transactionCode)
                .uniqueResultOptional();
    }

    @Override
    public Optional<PaymentTransaction> findByInvoiceId(Long invoiceId) {
        return hql("select e from PaymentTransaction e where e.invoice.id = :invoiceId")
                .setParameter("invoiceId", invoiceId)
                .uniqueResultOptional();
    }

    @Override
    public Optional<PaymentTransaction> findFirstByInvoiceIdAndStatusOrderByCompletedAtDescIdDesc(
            Long invoiceId, String status) {
        List<PaymentTransaction> rows =
                hql("select e from PaymentTransaction e where e.invoice.id = :invoiceId and e.status = :status order by e.completedAt desc, e.id desc")
                        .setParameter("invoiceId", invoiceId)
                        .setParameter("status", status)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public Page<PaymentTransaction> findAll(
            HibernateSpecification<PaymentTransaction> spec, Pageable pageable) {
        return findAllWithGraph(spec, pageable, "invoice", "user");
    }

    @Override
    public List<PaymentTransaction> findForStatistics(
            LocalDateTime from, LocalDateTime to, Collection<String> review) {
        if (isEmpty(review)) return List.of();
        return hql(
                        "select t from PaymentTransaction t"
                                + " where (t.completedAt >= :from and t.completedAt < :to)"
                                + " or (t.createdAt >= :from and t.createdAt < :to)"
                                + " or (t.resolvedAt >= :from and t.resolvedAt < :to)"
                                + " or (t.status in :review and t.resolution is null)",
                        PaymentTransaction.class)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("review", review)
                .getResultList();
    }
}
