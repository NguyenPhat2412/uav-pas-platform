package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMissionReviewDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MissionReview;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class MissionReviewDaoImpl extends HibernateGenericDao<Long, MissionReview>
        implements IMissionReviewDao {

    private static final Logger logger = LoggerFactory.getLogger(MissionReviewDaoImpl.class);

    public MissionReviewDaoImpl(final EntityManager entityManager) {
        super(MissionReview.class, entityManager);
    }

    @Override
    public Optional<MissionReview> findByMissionId(Long missionId) {
        return hql("select e from MissionReview e where e.mission.id = :missionId")
                .setParameter("missionId", missionId)
                .uniqueResultOptional();
    }

    @Override
    public List<MissionReview> findByMissionIdIn(Collection<Long> missionIds) {
        if (isEmpty(missionIds)) return List.of();
        return hql("select e from MissionReview e where e.mission.id in :missionIds")
                .setParameter("missionIds", missionIds)
                .getResultList();
    }

    @Override
    public List<MissionReview> findTop20ByOrderByUpdatedAtDescIdDesc() {
        return withEntityGraph(
                        hql("select e from MissionReview e order by e.updatedAt desc, e.id desc"),
                        "mission",
                        "mission.operator",
                        "customer")
                .setMaxResults(20)
                .getResultList();
    }

    @Override
    public List<MissionReview> findAllWithMissionAndCustomer() {
        return withEntityGraph(
                        hql("select r from MissionReview r", MissionReview.class),
                        "mission",
                        "mission.operator",
                        "customer")
                .getResultList();
    }

    @Override
    public List<Object[]> averageOverallRatingByOperator() {
        return hql(
                        "select r.mission.operator.id, avg(r.overallRating) from MissionReview r where r.mission.operator is not null and r.overallRating is not null group by r.mission.operator.id",
                        Object[].class)
                .getResultList();
    }

    @Override
    public List<MissionReview> findTop20ByMissionListingIdOrderByUpdatedAtDescIdDesc(
            Long listingId) {
        return withEntityGraph(
                        hql("select e from MissionReview e where e.mission.listing.id = :listingId order by e.updatedAt desc, e.id desc")
                                .setParameter("listingId", listingId),
                        "mission",
                        "customer")
                .setMaxResults(20)
                .getResultList();
    }

    @Override
    public List<MissionReview> findTop20ByMissionProviderIdOrderByUpdatedAtDescIdDesc(
            Long providerId) {
        return withEntityGraph(
                        hql("select e from MissionReview e where e.mission.provider.id = :providerId order by e.updatedAt desc, e.id desc")
                                .setParameter("providerId", providerId),
                        "mission",
                        "mission.listing",
                        "customer")
                .setMaxResults(20)
                .getResultList();
    }

    @Override
    public List<MissionReview> findByMissionListingId(Long listingId) {
        return hql("select e from MissionReview e where e.mission.listing.id = :listingId")
                .setParameter("listingId", listingId)
                .getResultList();
    }

    @Override
    public List<MissionReview> findByMissionProviderId(Long providerId) {
        return hql("select e from MissionReview e where e.mission.provider.id = :providerId")
                .setParameter("providerId", providerId)
                .getResultList();
    }
}
