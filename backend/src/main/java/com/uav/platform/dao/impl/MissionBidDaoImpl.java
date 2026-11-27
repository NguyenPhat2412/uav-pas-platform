package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMissionBidDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MissionBid;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class MissionBidDaoImpl extends HibernateGenericDao<Long, MissionBid>
        implements IMissionBidDao {

    private static final Logger logger = LoggerFactory.getLogger(MissionBidDaoImpl.class);

    public MissionBidDaoImpl(final EntityManager entityManager) {
        super(MissionBid.class, entityManager);
    }

    @Override
    public List<MissionBid> findByMissionIdOrderByProposedPriceVndAscCreatedAtAsc(Long missionId) {
        return withEntityGraph(
                        hql("select e from MissionBid e where e.mission.id = :missionId order by e.proposedPriceVnd asc, e.createdAt asc")
                                .setParameter("missionId", missionId),
                        "provider",
                        "provider.user")
                .getResultList();
    }

    @Override
    public List<MissionBid> findByProviderIdOrderByCreatedAtDesc(Long providerId) {
        return withEntityGraph(
                        hql("select e from MissionBid e where e.provider.id = :providerId order by e.createdAt desc")
                                .setParameter("providerId", providerId),
                        "mission",
                        "mission.customer")
                .getResultList();
    }

    @Override
    public Optional<MissionBid> findByMissionIdAndProviderId(Long missionId, Long providerId) {
        return hql("select e from MissionBid e where e.mission.id = :missionId and e.provider.id = :providerId")
                .setParameter("missionId", missionId)
                .setParameter("providerId", providerId)
                .uniqueResultOptional();
    }
}
