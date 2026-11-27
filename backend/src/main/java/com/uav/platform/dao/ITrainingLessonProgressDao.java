package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.TrainingLessonProgress;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ITrainingLessonProgressDao extends IGenericDao<Long, TrainingLessonProgress> {
    Optional<TrainingLessonProgress> findByUserIdAndLessonId(Long userId, Long lessonId);

    List<TrainingLessonProgress> findByUserIdAndLessonIdIn(Long userId, Collection<Long> lessonIds);

    int upsertProgress(
            long userId, long lessonId, boolean complete, boolean setPosition, int position);

    List<LearnerLessonCounts> countByLearner(Collection<Long> lessonIds);

    interface LearnerLessonCounts {
        Long getUserId();

        Long getCompleted();

        Long getTouched();
    }
}
