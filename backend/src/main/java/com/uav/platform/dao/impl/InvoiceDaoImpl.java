package com.uav.platform.dao.impl;

import com.uav.platform.dao.IInvoiceDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.Invoice;
import com.uav.platform.enums.InvoiceStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class InvoiceDaoImpl extends HibernateGenericDao<Long, Invoice> implements IInvoiceDao {

    private static final Logger logger = LoggerFactory.getLogger(InvoiceDaoImpl.class);

    public InvoiceDaoImpl(final EntityManager entityManager) {
        super(Invoice.class, entityManager);
    }

    @Override
    public Optional<Invoice> findByIdForUpdate(Long id) {
        return hql("select i from Invoice i where i.id = :id", Invoice.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public Optional<Invoice> findByCode(String code) {
        return hql("select e from Invoice e where e.code = :code")
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public Optional<Invoice> findByNormalizedCode(String normalizedCode) {
        return hql(
                        "select i from Invoice i where upper(replace(i.code, '-', '')) = :normalizedCode",
                        Invoice.class)
                .setParameter("normalizedCode", normalizedCode)
                .uniqueResultOptional();
    }

    @Override
    public Page<Invoice> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable) {
        String effectiveHql =
                appendPageableSort(
                        "select e from Invoice e where e.user.id = :userId order by e.createdAt desc",
                        pageable);
        Query<Invoice> q =
                withEntityGraph(
                        hql(effectiveHql).setParameter("userId", userId),
                        "user",
                        "mission",
                        "plan",
                        "provider");
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        List<Invoice> content = q.getResultList();
        if (pageable == null || pageable.isUnpaged()) {
            return new PageImpl<>(content);
        }
        Long total =
                hql("select count(e) from Invoice e where e.user.id = :userId", Long.class)
                        .setParameter("userId", userId)
                        .getSingleResult();
        return new PageImpl<>(content, pageable, total == null ? 0L : total);
    }

    @Override
    public List<Invoice> findByUserId(Long userId) {
        return hql("select e from Invoice e where e.user.id = :userId")
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public long countByUserIdAndStatus(Long userId, InvoiceStatus status) {
        Long v =
                hql(
                                "select count(e) from Invoice e where e.user.id = :userId and e.status = :status",
                                Long.class)
                        .setParameter("userId", userId)
                        .setParameter("status", status)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public long countByUserId(Long userId) {
        Long v =
                hql("select count(e) from Invoice e where e.user.id = :userId", Long.class)
                        .setParameter("userId", userId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public boolean existsByMissionIdAndStatusIn(
            Long missionId, java.util.Collection<InvoiceStatus> statuses) {
        if (isEmpty(statuses)) return false;
        return !hql(
                        "select 1 from Invoice e where e.mission.id = :missionId and e.status in :statuses",
                        Integer.class)
                .setParameter("missionId", missionId)
                .setParameter("statuses", statuses)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public List<Invoice> findByMissionIdAndStatus(Long missionId, InvoiceStatus status) {
        return hql("select e from Invoice e where e.mission.id = :missionId and e.status = :status")
                .setParameter("missionId", missionId)
                .setParameter("status", status)
                .getResultList();
    }

    @Override
    public List<Invoice> findByMissionIdOrderByIdDesc(Long missionId) {
        return hql("select e from Invoice e where e.mission.id = :missionId order by e.id desc")
                .setParameter("missionId", missionId)
                .getResultList();
    }

    @Override
    public List<Invoice> findByStatusAndDueDateBeforeAndMissionIsNull(
            InvoiceStatus status, LocalDateTime dueBefore) {
        return hql("select e from Invoice e where e.status = :status and e.dueDate < :dueBefore and e.mission is null")
                .setParameter("status", status)
                .setParameter("dueBefore", dueBefore)
                .getResultList();
    }

    @Override
    public List<Invoice> findForStatistics(
            LocalDateTime from, LocalDateTime to, InvoiceStatus pending) {
        return hql(
                        "select i from Invoice i join fetch i.user left join fetch i.plan"
                                + " where (i.createdAt >= :from and i.createdAt < :to)"
                                + " or (i.paidAt >= :from and i.paidAt < :to)"
                                + " or i.status = :pending",
                        Invoice.class)
                .setParameter("from", from)
                .setParameter("to", to)
                .setParameter("pending", pending)
                .getResultList();
    }

    @Override
    public List<Object[]> totalsByPlan(
            InvoiceStatus pending,
            InvoiceStatus paid,
            LocalDateTime now,
            LocalDateTime lastMonth,
            LocalDateTime month,
            LocalDateTime nextMonth) {
        return hql(
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
                                + " from Invoice i left join i.plan p on i.mission is null group by p.id",
                        Object[].class)
                .setParameter("pending", pending)
                .setParameter("paid", paid)
                .setParameter("now", now)
                .setParameter("lastMonth", lastMonth)
                .setParameter("month", month)
                .setParameter("nextMonth", nextMonth)
                .getResultList();
    }

    @Override
    public List<Object[]> paidByMonthAndPlan(
            InvoiceStatus paid, LocalDateTime from, LocalDateTime to) {
        return hql(
                        "select extract(year from i.paidAt), extract(month from i.paidAt), p.code, sum(i.amount)"
                                + " from Invoice i left join i.plan p on i.mission is null"
                                + " where i.status = :paid and i.paidAt >= :from and i.paidAt < :to"
                                + " group by extract(year from i.paidAt), extract(month from i.paidAt), p.code",
                        Object[].class)
                .setParameter("paid", paid)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
    }

    @Override
    public List<Object[]> firstPlanPaymentsByMonth(
            InvoiceStatus paid, LocalDateTime from, LocalDateTime to) {
        return hql(
                        "select extract(year from i.paidAt), extract(month from i.paidAt), count(distinct i.user.id)"
                                + " from Invoice i where i.status = :paid and i.plan is not null and i.mission is null"
                                + " and i.paidAt >= :from and i.paidAt < :to"
                                + " and i.paidAt = (select min(f.paidAt) from Invoice f where f.user = i.user"
                                + " and f.status = :paid and f.plan is not null and f.mission is null)"
                                + " group by extract(year from i.paidAt), extract(month from i.paidAt)",
                        Object[].class)
                .setParameter("paid", paid)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();
    }
}
