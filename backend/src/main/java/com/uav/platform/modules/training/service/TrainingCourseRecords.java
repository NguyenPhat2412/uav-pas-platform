package com.uav.platform.modules.training.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.modules.training.entity.TrainingDocument;
import com.uav.platform.modules.training.entity.TrainingLesson;
import com.uav.platform.modules.training.entity.UserTrainingProgress;
import com.uav.platform.modules.training.repository.TrainingLessonProgressRepository;
import com.uav.platform.modules.training.repository.TrainingLessonProgressRepository.LearnerLessonCounts;
import com.uav.platform.modules.training.repository.TrainingLessonRepository;
import com.uav.platform.modules.training.repository.UserTrainingProgressRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Keeps the stored course records (user_training_progress) consistent with {@link
 * TrainingCourseProgress#recordStatus}. The records feed the old overview counters and the course cards, so
 * they are recomputed on every write that can change a learner's state, including an administrator changing
 * which lessons of a course are active.
 */
@Component
@RequiredArgsConstructor
public class TrainingCourseRecords {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final TrainingLessonRepository lessons;
    private final TrainingLessonProgressRepository lessonProgress;
    private final UserTrainingProgressRepository courseProgress;

    /**
     * Recomputes every learner's record of these courses after their active lesson set changed (a lesson was
     * added, hidden, shown, moved or deleted). Only records whose status changes are written; a COMPLETED record
     * stays COMPLETED (see {@link #apply}).
     */
    public void recompute(Set<TrainingDocument> docs) {
        for (TrainingDocument doc : docs) if (doc != null && doc.getId() != null) recompute(doc);
    }

    private void recompute(TrainingDocument doc) {
        List<UserTrainingProgress> records = courseProgress.findByDocumentId(doc.getId());
        if (records.isEmpty()) return;
        List<Long> lessonIds =
                lessons.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(doc.getId()).stream()
                        .map(TrainingLesson::getId)
                        .toList();
        Map<Long, LearnerLessonCounts> counts = new HashMap<>();
        if (!lessonIds.isEmpty())
            for (LearnerLessonCounts c : lessonProgress.countByLearner(lessonIds))
                counts.put(c.getUserId(), c);
        int checklistSize = checklistSize(doc);

        List<UserTrainingProgress> changed = new ArrayList<>();
        for (UserTrainingProgress record : records) {
            Long userId = record.getUser() == null ? null : record.getUser().getId();
            LearnerLessonCounts c = userId == null ? null : counts.get(userId);
            int completed = c == null || c.getCompleted() == null ? 0 : c.getCompleted().intValue();
            boolean touched = c != null && c.getTouched() != null && c.getTouched() > 0;
            String next =
                    TrainingCourseProgress.recordStatus(
                            record.getStatus(),
                            completed,
                            lessonIds.size(),
                            checklistSize,
                            checkedCount(record.getCheckedStepsJson(), checklistSize),
                            touched);
            if (apply(record, next)) changed.add(record);
        }
        if (!changed.isEmpty()) courseProgress.saveAll(changed);
    }

    /**
     * Sets the status, stamping completedAt on the first completion. A completion is history: a COMPLETED record
     * is never moved back (lessons added later, a step unticked) and completedAt is never cleared.
     *
     * @return whether the status changed
     */
    public static boolean apply(UserTrainingProgress record, String status) {
        if (TrainingCourseProgress.COMPLETED.equals(record.getStatus())) {
            if (record.getCompletedAt() == null) record.setCompletedAt(OffsetDateTime.now());
            return false;
        }
        boolean changed = !Objects.equals(record.getStatus(), status);
        record.setStatus(status);
        if (TrainingCourseProgress.COMPLETED.equals(status) && record.getCompletedAt() == null)
            record.setCompletedAt(OffsetDateTime.now());
        return changed;
    }

    public static List<String> checklist(TrainingDocument doc) {
        return parse(
                doc == null ? null : doc.getChecklistJson(), new TypeReference<List<String>>() {});
    }

    public static int checklistSize(TrainingDocument doc) {
        return checklist(doc).size();
    }

    /** Distinct ticked step indexes that exist in a checklist of the given size. */
    public static int checkedCount(String checkedStepsJson, int checklistSize) {
        Set<Integer> valid = new HashSet<>();
        for (Integer i : parse(checkedStepsJson, new TypeReference<List<Integer>>() {}))
            if (i != null && i >= 0 && i < checklistSize) valid.add(i);
        return valid.size();
    }

    private static <T> List<T> parse(String json, TypeReference<List<T>> type) {
        if (!StringUtils.hasText(json)) return List.of();
        try {
            List<T> list = JSON.readValue(json, type);
            return list == null ? List.of() : list;
        } catch (Exception ex) {
            return List.of();
        }
    }
}
