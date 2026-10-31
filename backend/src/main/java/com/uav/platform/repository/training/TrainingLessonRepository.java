package com.uav.platform.repository.training;

import com.uav.platform.entity.training.TrainingLesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface TrainingLessonRepository
        extends JpaRepository<TrainingLesson, Long>, JpaSpecificationExecutor<TrainingLesson> {

    /** Every lesson of a course, drafts included, in course order (admin editor). */
    List<TrainingLesson> findByDocumentIdOrderBySortOrderAscIdAsc(Long documentId);

    /** Lessons learners see, in course order. */
    List<TrainingLesson> findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(Long documentId);

    /** Active lessons of several courses at once (course list), in course order. */
    List<TrainingLesson> findByDocumentIdInAndActiveTrueOrderBySortOrderAscIdAsc(
            Collection<Long> documentIds);

    /**
     * Number of downloadable resources per lesson as [lessonId, count] rows, without loading the resources;
     * lessons with none are absent.
     */
    @Query(
            value =
                    "SELECT lesson_id, COUNT(*) FROM training_lesson_resources WHERE lesson_id IN (:lessonIds) GROUP BY lesson_id",
            nativeQuery = true)
    List<Object[]> countResources(@Param("lessonIds") Collection<Long> lessonIds);
}
