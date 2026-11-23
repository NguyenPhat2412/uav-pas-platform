package com.uav.platform.dao.impl.mission;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.mission.ISavedFlightSiteDao;
import com.uav.platform.entity.mission.SavedFlightSite;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class SavedFlightSiteDaoImpl extends HibernateGenericDao<Long, SavedFlightSite>
        implements ISavedFlightSiteDao {

    private static final Logger logger = LoggerFactory.getLogger(SavedFlightSiteDaoImpl.class);

    public SavedFlightSiteDaoImpl(final EntityManager entityManager) {
        super(SavedFlightSite.class, entityManager);
    }

    @Override
    public List<SavedFlightSite> findByUserIdOrderByUpdatedAtDescIdDesc(Long userId) {
        return hql("select e from SavedFlightSite e where e.user.id = :userId order by e.updatedAt desc, e.id desc")
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public long countByUserId(Long userId) {
        Long v =
                hql("select count(e) from SavedFlightSite e where e.user.id = :userId", Long.class)
                        .setParameter("userId", userId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public Optional<SavedFlightSite> findByIdAndUserId(Long id, Long userId) {
        return hql("select e from SavedFlightSite e where e.id = :id and e.user.id = :userId")
                .setParameter("id", id)
                .setParameter("userId", userId)
                .uniqueResultOptional();
    }
}
