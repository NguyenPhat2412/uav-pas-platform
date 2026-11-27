package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.Mission;
import com.uav.platform.enums.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class MissionDaoImpl extends HibernateGenericDao<Long, Mission> implements IMissionDao {

    private static final Logger logger = LoggerFactory.getLogger(MissionDaoImpl.class);

    public MissionDaoImpl(final EntityManager entityManager) {
        super(Mission.class, entityManager);
    }

    @Override
    public Optional<Mission> findByCode(String code) {
        return hql("select e from Mission e where e.code = :code")
                .setParameter("code", code)
                .uniqueResultOptional();
    }

    @Override
    public long nextCodeValue() {
        Object value =
                nativeSql("select nextval('mission_code_seq')", Object.class).getSingleResult();
        return value == null ? 0L : ((Number) value).longValue();
    }

    @Override
    public Optional<Mission> findByIdForUpdate(Long id) {
        return hql("select m from Mission m where m.id = :id", Mission.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public java.util.List<Mission> findByCustomerIdAndStatusNotIn(
            Long customerId, Collection<MissionStatus> closedStatuses) {
        if (isEmpty(closedStatuses)) {
            return hql("select e from Mission e where e.customer.id = :customerId")
                    .setParameter("customerId", customerId)
                    .getResultList();
        }
        return hql("select e from Mission e where e.customer.id = :customerId and e.status not in :closedStatuses")
                .setParameter("customerId", customerId)
                .setParameter("closedStatuses", closedStatuses)
                .getResultList();
    }

    @Override
    public long countActiveByUserId(Long userId, Collection<MissionStatus> closedStatuses) {
        Long v =
                hql(
                                "select count(m) from Mission m where (m.customer.id = :userId or m.operator.id = :userId) and m.status not in :closedStatuses",
                                Long.class)
                        .setParameter("userId", userId)
                        .setParameter("closedStatuses", closedStatuses)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public long countAnyByUserId(Long userId) {
        Long v =
                hql(
                                "select count(m) from Mission m where m.customer.id = :userId or m.operator.id = :userId",
                                Long.class)
                        .setParameter("userId", userId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public Optional<Mission> findFirstByUavIdAndStatusOrderByIdDesc(
            Long uavId, MissionStatus status) {
        List<Mission> rows =
                hql("select e from Mission e where e.uav.id = :uavId and e.status = :status order by e.id desc")
                        .setParameter("uavId", uavId)
                        .setParameter("status", status)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public boolean existsByUavIdAndStatusNotIn(
            Long uavId, Collection<MissionStatus> terminalStatuses) {
        if (isEmpty(terminalStatuses)) {
            return !hql("select 1 from Mission e where e.uav.id = :uavId", Integer.class)
                    .setParameter("uavId", uavId)
                    .setMaxResults(1)
                    .getResultList()
                    .isEmpty();
        }
        return !hql(
                        "select 1 from Mission e where e.uav.id = :uavId and e.status not in :terminalStatuses",
                        Integer.class)
                .setParameter("uavId", uavId)
                .setParameter("terminalStatuses", terminalStatuses)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByUavIdAndIdNotAndStatusNotIn(
            Long uavId, Long missionId, Collection<MissionStatus> terminalStatuses) {
        if (isEmpty(terminalStatuses)) {
            return !hql(
                            "select 1 from Mission e where e.uav.id = :uavId and e.id <> :missionId",
                            Integer.class)
                    .setParameter("uavId", uavId)
                    .setParameter("missionId", missionId)
                    .setMaxResults(1)
                    .getResultList()
                    .isEmpty();
        }
        return !hql(
                        "select 1 from Mission e where e.uav.id = :uavId and e.id <> :missionId and e.status not in :terminalStatuses",
                        Integer.class)
                .setParameter("uavId", uavId)
                .setParameter("missionId", missionId)
                .setParameter("terminalStatuses", terminalStatuses)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByUavIdAndIdNotAndStatus(
            Long uavId, Long missionId, MissionStatus status) {
        return !hql(
                        "select 1 from Mission e where e.uav.id = :uavId and e.id <> :missionId and e.status = :status",
                        Integer.class)
                .setParameter("uavId", uavId)
                .setParameter("missionId", missionId)
                .setParameter("status", status)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public List<Mission> findActiveWithResourcesNotIn(Collection<MissionStatus> excludedStatuses) {
        return withEntityGraph(
                        hql(
                                        "select m from Mission m where m.status not in :excludedStatuses",
                                        Mission.class)
                                .setParameter("excludedStatuses", excludedStatuses),
                        "uav",
                        "operator",
                        "station")
                .getResultList();
    }

    @Override
    public List<Object[]> countCompletedByOperator() {
        return hql(
                        "select m.operator.id, count(m) from Mission m where m.status = com.uav.platform.enums.MissionStatus.COMPLETED and m.operator is not null group by m.operator.id",
                        Object[].class)
                .getResultList();
    }

    @Override
    public List<Mission> findAllNonDraftWithAssociations() {
        return withEntityGraph(
                        hql(
                                "select m from Mission m where m.status <> com.uav.platform.enums.MissionStatus.DRAFT",
                                Mission.class),
                        "uav",
                        "operator",
                        "station",
                        "customer")
                .getResultList();
    }

    @Override
    public List<Mission> findByProviderIdOrderByCreatedAtDesc(Long providerId) {
        return withEntityGraph(
                        hql("select e from Mission e where e.provider.id = :providerId order by e.createdAt desc")
                                .setParameter("providerId", providerId),
                        "uav",
                        "operator",
                        "station",
                        "customer",
                        "listing",
                        "provider")
                .getResultList();
    }

    @Override
    public List<Mission> findOpenRfqMissions(Collection<MissionStatus> openStatuses) {
        if (isEmpty(openStatuses)) return List.of();
        return withEntityGraph(
                        hql(
                                        "select m from Mission m where m.providerResponseStatus = com.uav.platform.enums.ProviderOrderStatus.OPEN_RFQ and m.status in :openStatuses order by m.createdAt desc",
                                        Mission.class)
                                .setParameter("openStatuses", openStatuses),
                        "customer",
                        "service")
                .getResultList();
    }

    @Override
    public long countByProjectId(Long projectId) {
        Long v =
                hql("select count(e) from Mission e where e.project.id = :projectId", Long.class)
                        .setParameter("projectId", projectId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public boolean existsByProjectIdAndStatusNotIn(
            Long projectId, Collection<MissionStatus> terminalStatuses) {
        if (isEmpty(terminalStatuses)) {
            return !hql("select 1 from Mission e where e.project.id = :projectId", Integer.class)
                    .setParameter("projectId", projectId)
                    .setMaxResults(1)
                    .getResultList()
                    .isEmpty();
        }
        return !hql(
                        "select 1 from Mission e where e.project.id = :projectId and e.status not in :terminalStatuses",
                        Integer.class)
                .setParameter("projectId", projectId)
                .setParameter("terminalStatuses", terminalStatuses)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public Optional<Mission> findFirstBySubscriptionIdOrderByIdAsc(Long subscriptionId) {
        List<Mission> rows =
                hql("select e from Mission e where e.subscription.id = :subscriptionId order by e.id asc")
                        .setParameter("subscriptionId", subscriptionId)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public Optional<Mission> findFirstBySubscriptionIdOrderByIdDesc(Long subscriptionId) {
        List<Mission> rows =
                hql("select e from Mission e where e.subscription.id = :subscriptionId order by e.id desc")
                        .setParameter("subscriptionId", subscriptionId)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }
}
