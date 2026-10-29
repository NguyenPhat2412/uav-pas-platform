package com.uav.platform.modules.training.repository;

import com.uav.platform.modules.training.entity.TrainingLesson;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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
}
