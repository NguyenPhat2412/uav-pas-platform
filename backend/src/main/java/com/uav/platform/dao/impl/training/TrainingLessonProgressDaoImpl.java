package com.uav.platform.dao.impl.training;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.training.ITrainingLessonProgressDao;
import com.uav.platform.entity.training.TrainingLessonProgress;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class TrainingLessonProgressDaoImpl extends HibernateGenericDao<Long, TrainingLessonProgress>
        implements ITrainingLessonProgressDao {

    private static final Logger logger =
            LoggerFactory.getLogger(TrainingLessonProgressDaoImpl.class);

    public TrainingLessonProgressDaoImpl(final EntityManager entityManager) {
        super(TrainingLessonProgress.class, entityManager);
    }

    @Override
    public Optional<TrainingLessonProgress> findByUserIdAndLessonId(Long userId, Long lessonId) {
        return hql("select e from TrainingLessonProgress e where e.user.id = :userId and e.lesson.id = :lessonId")
                .setParameter("userId", userId)
                .setParameter("lessonId", lessonId)
                .uniqueResultOptional();
    }

    @Override
    public List<TrainingLessonProgress> findByUserIdAndLessonIdIn(
            Long userId, Collection<Long> lessonIds) {
        if (isEmpty(lessonIds)) return List.of();
        return hql("select e from TrainingLessonProgress e where e.user.id = :userId and e.lesson.id in :lessonIds")
                .setParameter("userId", userId)
                .setParameter("lessonIds", lessonIds)
                .getResultList();
    }

    @Override
    @Transactional
    public int upsertProgress(
            long userId, long lessonId, boolean complete, boolean setPosition, int position) {
        flush();
        return nativeMutation(
                        """
                    INSERT INTO training_lesson_progress
                        (user_id, lesson_id, completed_at, position_seconds, created_at, updated_at)
                    VALUES (:userId, :lessonId,
                            CASE WHEN :complete THEN CURRENT_TIMESTAMP END,
                            :position, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
                        completed_at = COALESCE(training_lesson_progress.completed_at, EXCLUDED.completed_at),
                        position_seconds = CASE WHEN :setPosition THEN EXCLUDED.position_seconds
                                                ELSE training_lesson_progress.position_seconds END,
                        updated_at = CURRENT_TIMESTAMP
                    """)
                .setParameter("userId", userId)
                .setParameter("lessonId", lessonId)
                .setParameter("complete", complete)
                .setParameter("setPosition", setPosition)
                .setParameter("position", position)
                .executeUpdate();
    }

    @Override
    public List<LearnerLessonCounts> countByLearner(Collection<Long> lessonIds) {
        if (isEmpty(lessonIds)) return List.of();
        List<Object[]> rows =
                hql(
                                """
            select p.user.id as userId,
                   sum(case when p.completedAt is not null then 1 else 0 end) as completed,
                   sum(case when p.completedAt is not null or p.positionSeconds > 0 then 1 else 0 end)
                       as touched
            from TrainingLessonProgress p
            where p.lesson.id in :lessonIds
            group by p.user.id
            """,
                                Object[].class)
                        .setParameter("lessonIds", lessonIds)
                        .getResultList();
        return rows.stream()
                .<LearnerLessonCounts>map(
                        r ->
                                new LearnerLessonCounts() {
                                    @Override
                                    public Long getUserId() {
                                        return r[0] == null ? null : ((Number) r[0]).longValue();
                                    }

                                    @Override
                                    public Long getCompleted() {
                                        return r[1] == null ? 0L : ((Number) r[1]).longValue();
                                    }

                                    @Override
                                    public Long getTouched() {
                                        return r[2] == null ? 0L : ((Number) r[2]).longValue();
                                    }
                                })
                .toList();
    }
}
