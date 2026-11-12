package com.uav.platform.dto.record.training;

import com.uav.platform.entity.training.TrainingDocument;
import com.uav.platform.entity.training.TrainingLesson;
import com.uav.platform.entity.training.TrainingLessonProgress;
import com.uav.platform.entity.training.UserTrainingProgress;

import java.util.List;
import java.util.Map;

/**
 * One learner's view of a course: its active lessons in order, their progress rows by lesson id, and the
 * existing course record (null when the learner never touched the course).
 */
public record TrainingCourseState(
        TrainingDocument doc,
        List<TrainingLesson> lessons,
        Map<Long, TrainingLessonProgress> progress,
        UserTrainingProgress record) {

    public static boolean completed(TrainingLessonProgress progress) {
        return progress != null && progress.getCompletedAt() != null;
    }

    public int completedLessons() {
        return (int) lessons.stream().filter(l -> completed(progress.get(l.getId()))).count();
    }

    public boolean anyActivity() {
        return lessons.stream()
                .map(l -> progress.get(l.getId()))
                .anyMatch(
                        p ->
                                completed(p)
                                        || (p != null
                                                && p.getPositionSeconds() != null
                                                && p.getPositionSeconds() > 0));
    }
}
