package com.uav.platform.modules.training.repository;

import com.uav.platform.modules.training.entity.TrainingLessonProgress;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TrainingLessonProgressRepository
        extends JpaRepository<TrainingLessonProgress, Long>,
                JpaSpecificationExecutor<TrainingLessonProgress> {

    Optional<TrainingLessonProgress> findByUserIdAndLessonId(Long userId, Long lessonId);

    List<TrainingLessonProgress> findByUserIdAndLessonIdIn(Long userId, Collection<Long> lessonIds);

    /**
     * Atomic save of one learner's lesson state, safe when two saves of a first visit race (no read-then-insert,
     * so the unique (user_id, lesson_id) constraint is never hit). {@code complete} stamps completed_at only
     * when it is still empty, and nothing here ever clears it: a lesson, once completed, stays completed.
     * position_seconds changes only when {@code setPosition} is true.
     */
    @Modifying(flushAutomatically = true)
    @Query(
            value =
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
                    """,
            nativeQuery = true)
    int upsertProgress(
            @Param("userId") long userId,
            @Param("lessonId") long lessonId,
            @Param("complete") boolean complete,
            @Param("setPosition") boolean setPosition,
            @Param("position") int position);

    /** Per learner: completed lessons and lessons with any activity among the given (active) lessons. */
    @Query(
            """
            select p.user.id as userId,
                   sum(case when p.completedAt is not null then 1 else 0 end) as completed,
                   sum(case when p.completedAt is not null or p.positionSeconds > 0 then 1 else 0 end)
                       as touched
            from TrainingLessonProgress p
            where p.lesson.id in :lessonIds
            group by p.user.id
            """)
    List<LearnerLessonCounts> countByLearner(@Param("lessonIds") Collection<Long> lessonIds);

    interface LearnerLessonCounts {
        Long getUserId();

        Long getCompleted();

        Long getTouched();
    }
}
