package com.uav.platform.dao.impl.training;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.training.IUserTrainingProgressDao;
import com.uav.platform.entity.training.UserTrainingProgress;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public class UserTrainingProgressDaoImpl extends HibernateGenericDao<Long, UserTrainingProgress>
        implements IUserTrainingProgressDao {

    private static final Logger logger = LoggerFactory.getLogger(UserTrainingProgressDaoImpl.class);

    public UserTrainingProgressDaoImpl(final EntityManager entityManager) {
        super(UserTrainingProgress.class, entityManager);
    }

    @Override
    public List<UserTrainingProgress> findByUserId(Long userId) {
        return hql("select e from UserTrainingProgress e where e.user.id = :userId")
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public Optional<UserTrainingProgress> findByUserIdAndDocumentId(Long userId, Long documentId) {
        return hql("select e from UserTrainingProgress e where e.user.id = :userId and e.document.id = :documentId")
                .setParameter("userId", userId)
                .setParameter("documentId", documentId)
                .uniqueResultOptional();
    }

    @Override
    public List<UserTrainingProgress> findByDocumentId(Long documentId) {
        return hql("select e from UserTrainingProgress e where e.document.id = :documentId")
                .setParameter("documentId", documentId)
                .getResultList();
    }

    @Override
    @Transactional
    public int insertIfAbsent(long userId, long documentId) {
        flush();
        return nativeMutation(
                        """
                    INSERT INTO user_training_progress
                        (user_id, document_id, status, checked_steps_json, last_viewed_at,
                         created_at, updated_at)
                    VALUES (:userId, :documentId, 'NOT_STARTED', '[]', CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, document_id) DO NOTHING
                    """)
                .setParameter("userId", userId)
                .setParameter("documentId", documentId)
                .executeUpdate();
    }
}
