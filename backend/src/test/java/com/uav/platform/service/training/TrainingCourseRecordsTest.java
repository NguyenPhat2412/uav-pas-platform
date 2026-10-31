package com.uav.platform.service.training;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.training.TrainingDocument;
import com.uav.platform.entity.training.TrainingLesson;
import com.uav.platform.entity.training.UserTrainingProgress;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.repository.training.TrainingLessonProgressRepository;
import com.uav.platform.repository.training.TrainingLessonProgressRepository.LearnerLessonCounts;
import com.uav.platform.repository.training.TrainingLessonRepository;
import com.uav.platform.repository.training.UserTrainingProgressRepository;

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
    void addingALessonKeepsCompletionsAndHidingTheLastUnfinishedOneCompletesTheRest() {
        UserTrainingProgress finished = record(7L, "COMPLETED");
        OffsetDateTime finishedAt = OffsetDateTime.parse("2026-03-01T08:00:00+07:00");
        finished.setCompletedAt(finishedAt);
        UserTrainingProgress almost = record(8L, "IN_PROGRESS");
        UserTrainingProgress idle = record(9L, "NOT_STARTED");
        when(courseProgress.findByDocumentId(1L)).thenReturn(List.of(finished, almost, idle));

        // A third lesson was added: user 7 had done the first two only, and keeps the completion.
        activeLessons(10L, 11L, 12L);
        when(lessonProgress.countByLearner(anyCollection()))
                .thenReturn(List.of(counts(7L, 2, 2), counts(8L, 2, 2)));
        records.recompute(Set.of(course));
        assertEquals("COMPLETED", finished.getStatus());
        assertEquals(finishedAt, finished.getCompletedAt());
        assertEquals("IN_PROGRESS", almost.getStatus());
        assertNull(almost.getCompletedAt());
        assertEquals("NOT_STARTED", idle.getStatus());
        // Nothing changed, so nothing is written.
        verify(courseProgress, never()).saveAll(any(Collection.class));

        // The new lesson was hidden again: user 8 completes now, user 7 keeps the original date.
        activeLessons(10L, 11L);
        records.recompute(Set.of(course));
        assertEquals("COMPLETED", finished.getStatus());
        assertEquals(finishedAt, finished.getCompletedAt());
        assertEquals("COMPLETED", almost.getStatus());
        assertNotNull(almost.getCompletedAt());
        assertEquals("NOT_STARTED", idle.getStatus());
        assertEquals(List.of(almost), saved);
    }

    @Test
    void firstLessonOfACourseWithoutLessonsKeepsEveryCompletion() {
        // Every lesson was switched off (V35): the first lesson an administrator adds must not
        // reopen anyone who completed the course before.
        UserTrainingProgress finished = record(7L, "COMPLETED");
        OffsetDateTime finishedAt = OffsetDateTime.parse("2025-11-20T10:30:00+07:00");
        finished.setCompletedAt(finishedAt);
        UserTrainingProgress started = record(8L, "IN_PROGRESS");
        UserTrainingProgress idle = record(9L, "NOT_STARTED");
        when(courseProgress.findByDocumentId(1L)).thenReturn(List.of(finished, started, idle));

        activeLessons(10L);
        when(lessonProgress.countByLearner(anyCollection())).thenReturn(List.of());
        records.recompute(Set.of(course));

        assertEquals("COMPLETED", finished.getStatus());
        assertEquals(finishedAt, finished.getCompletedAt());
        assertEquals("IN_PROGRESS", started.getStatus());
        assertEquals("NOT_STARTED", idle.getStatus());
        verify(courseProgress, never()).saveAll(any(Collection.class));
    }

    @Test
    void notStartedLearnerWhoFinishedEveryLessonIsUpgraded() {
        UserTrainingProgress idle = record(9L, "NOT_STARTED");
        when(courseProgress.findByDocumentId(1L)).thenReturn(List.of(idle));
        activeLessons(10L);
        when(lessonProgress.countByLearner(anyCollection())).thenReturn(List.of(counts(9L, 1, 1)));

        records.recompute(Set.of(course));

        assertEquals("COMPLETED", idle.getStatus());
        assertNotNull(idle.getCompletedAt());
        assertEquals(List.of(idle), saved);
    }

    @Test
    void applyNeverDowngradesOrClearsTheCompletionDate() {
        UserTrainingProgress r = record(7L, "COMPLETED");
        OffsetDateTime at = r.getCompletedAt();
        assertFalse(TrainingCourseRecords.apply(r, "IN_PROGRESS"));
        assertFalse(TrainingCourseRecords.apply(r, "NOT_STARTED"));
        assertFalse(TrainingCourseRecords.apply(r, "COMPLETED"));
        assertEquals("COMPLETED", r.getStatus());
        assertEquals(at, r.getCompletedAt());

        UserTrainingProgress open = record(8L, "IN_PROGRESS");
        assertTrue(TrainingCourseRecords.apply(open, "COMPLETED"));
        assertNotNull(open.getCompletedAt());
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
        // An earlier completion is kept even though the checklist is only partly ticked.
        assertEquals("COMPLETED", partly.getStatus());
        assertNotNull(partly.getCompletedAt());

        // Every lesson hidden: the checklist alone decides, no lesson query is made.
        activeLessons();
        reset(lessonProgress);
        records.recompute(Set.of(course));
        assertEquals("COMPLETED", ticked.getStatus());
        assertEquals("COMPLETED", partly.getStatus());
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
