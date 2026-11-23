package com.uav.platform.dao.training;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.training.TrainingLesson;

import java.util.Collection;
import java.util.List;

public interface ITrainingLessonDao extends IGenericDao<Long, TrainingLesson> {
    List<TrainingLesson> findByDocumentIdOrderBySortOrderAscIdAsc(Long documentId);

    List<TrainingLesson> findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(Long documentId);

    List<TrainingLesson> findByDocumentIdInAndActiveTrueOrderBySortOrderAscIdAsc(
            Collection<Long> documentIds);

    List<Object[]> countResources(Collection<Long> lessonIds);
}
