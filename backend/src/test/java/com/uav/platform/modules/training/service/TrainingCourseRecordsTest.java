package com.uav.platform.modules.training.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.training.entity.TrainingDocument;
import com.uav.platform.modules.training.entity.TrainingLesson;
import com.uav.platform.modules.training.entity.UserTrainingProgress;
import com.uav.platform.modules.training.repository.TrainingLessonProgressRepository;
import com.uav.platform.modules.training.repository.TrainingLessonProgressRepository.LearnerLessonCounts;
import com.uav.platform.modules.training.repository.TrainingLessonRepository;
import com.uav.platform.modules.training.repository.UserTrainingProgressRepository;
import com.uav.platform.modules.user.entity.AppUser;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

@DisplayName("Course records follow the active lesson set")
class TrainingCourseRecordsTest {

    private TrainingLessonRepository lessons;
    private TrainingLessonProgressRepository lessonProgress;
    private UserTrainingProgressRepository courseProgress;
    private TrainingCourseRecords records;
    private TrainingDocument course;
    private final List<UserTrainingProgress> saved = new ArrayList<>();

    @BeforeEach
    void setUp() {
        lessons = mock(TrainingLessonRepository.class);
        lessonProgress = mock(TrainingLessonProgressRepository.class);
        courseProgress = mock(UserTrainingProgressRepository.class);
        records = new TrainingCourseRecords(lessons, lessonProgress, courseProgress);
        course = new TrainingDocument();
        course.setId(1L);
        course.setChecklistJson("[]");
        when(courseProgress.saveAll(any()))
                .thenAnswer(
                        inv -> {
                            for (Object r : (Iterable<?>) inv.getArgument(0))
                                saved.add((UserTrainingProgress) r);
                            return inv.getArgument(0);
                        });
    }

    private UserTrainingProgress record(long userId, String status) {
        AppUser user = new AppUser();
        user.setId(userId);
        UserTrainingProgress r = new UserTrainingProgress();
        r.setUser(user);
        r.setDocument(course);
        r.setStatus(status);
        if ("COMPLETED".equals(status)) r.setCompletedAt(OffsetDateTime.now());
        return r;
    }

    private void activeLessons(long... ids) {
        List<TrainingLesson> list = new ArrayList<>();
        for (long id : ids) {
            TrainingLesson l = new TrainingLesson();
            l.setId(id);
            list.add(l);
        }
        when(lessons.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(1L)).thenReturn(list);
    }

    private static LearnerLessonCounts counts(long userId, long completed, long touched) {
        return new LearnerLessonCounts() {
            public Long getUserId() {
                return userId;
            }

            public Long getCompleted() {
                return completed;
            }

            public Long getTouched() {
                return touched;
            }
        };
    }

    @Test
    void addingALessonReopensCompletedLearnersAndHidingOneCompletesTheRest() {
        UserTrainingProgress finished = record(7L, "COMPLETED");
        UserTrainingProgress almost = record(8L, "IN_PROGRESS");
        UserTrainingProgress idle = record(9L, "NOT_STARTED");
        when(courseProgress.findByDocumentId(1L)).thenReturn(List.of(finished, almost, idle));

        // A third lesson was added: user 7 had done the first two only.
        activeLessons(10L, 11L, 12L);
        when(lessonProgress.countByLearner(anyCollection()))
                .thenReturn(List.of(counts(7L, 2, 2), counts(8L, 2, 2)));
        records.recompute(Set.of(course));
        assertEquals("IN_PROGRESS", finished.getStatus());
        assertNull(finished.getCompletedAt());
        assertEquals("IN_PROGRESS", almost.getStatus());
        assertEquals("NOT_STARTED", idle.getStatus());
        // Only the record that changed is written.
        assertEquals(List.of(finished), saved);

        // The new lesson was hidden again: both are complete now.
        saved.clear();
        activeLessons(10L, 11L);
        records.recompute(Set.of(course));
        assertEquals("COMPLETED", finished.getStatus());
        assertNotNull(finished.getCompletedAt());
        assertEquals("COMPLETED", almost.getStatus());
        assertEquals("NOT_STARTED", idle.getStatus());
        assertEquals(2, saved.size());
    }

    @Test
    void checklistStillCountsAndCoursesWithoutLessonsUseTheChecklistRule() {
        course.setChecklistJson("[\"a\",\"b\"]");
        UserTrainingProgress ticked = record(7L, "IN_PROGRESS");
        ticked.setCheckedStepsJson("[0,1,1,5]");
        UserTrainingProgress partly = record(8L, "COMPLETED");
        partly.setCheckedStepsJson("[0]");
        when(courseProgress.findByDocumentId(1L)).thenReturn(List.of(ticked, partly));

        activeLessons(10L);
        when(lessonProgress.countByLearner(anyCollection()))
                .thenReturn(List.of(counts(7L, 1, 1), counts(8L, 1, 1)));
        records.recompute(Set.of(course));
        assertEquals("COMPLETED", ticked.getStatus());
        assertEquals("IN_PROGRESS", partly.getStatus());

        // Every lesson hidden: the checklist alone decides, no lesson query is made.
        activeLessons();
        reset(lessonProgress);
        records.recompute(Set.of(course));
        assertEquals("COMPLETED", ticked.getStatus());
        assertEquals("IN_PROGRESS", partly.getStatus());
        verifyNoInteractions(lessonProgress);
    }

    @Test
    void courseWithoutLearnersIsNotQueried() {
        when(courseProgress.findByDocumentId(1L)).thenReturn(List.of());
        records.recompute(Set.of(course));
        verifyNoInteractions(lessons, lessonProgress);
        verify(courseProgress, never()).saveAll(any(Collection.class));
    }
}
