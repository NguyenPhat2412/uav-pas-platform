package com.uav.platform.modules.training.repository;

import com.uav.platform.modules.training.entity.UserTrainingProgress;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserTrainingProgressRepository
        extends JpaRepository<UserTrainingProgress, Long>,
                JpaSpecificationExecutor<UserTrainingProgress> {

    List<UserTrainingProgress> findByUserId(Long userId);

    Optional<UserTrainingProgress> findByUserIdAndDocumentId(Long userId, Long documentId);

    /** Every learner's record of one course (recomputed when its active lessons change). */
    List<UserTrainingProgress> findByDocumentId(Long documentId);

    /**
     * Creates the learner's NOT_STARTED record unless one exists, so concurrent first saves never collide on
     * uq_user_training_progress; callers then load the row and update it.
     */
    @Modifying(flushAutomatically = true)
    @Query(
            value =
                    """
                    INSERT INTO user_training_progress
                        (user_id, document_id, status, checked_steps_json, last_viewed_at,
                         created_at, updated_at)
                    VALUES (:userId, :documentId, 'NOT_STARTED', '[]', CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, document_id) DO NOTHING
                    """,
            nativeQuery = true)
    int insertIfAbsent(@Param("userId") long userId, @Param("documentId") long documentId);
}
