package com.uav.platform.modules.training.repository;

import com.uav.platform.modules.training.entity.TrainingLessonProgress;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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
}
