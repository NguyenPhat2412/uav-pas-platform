package com.uav.platform.modules.training.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.training.dto.request.UpdateLessonProgressRequest;
import com.uav.platform.modules.training.dto.response.TrainingCourseDetailResponse;
import com.uav.platform.modules.training.dto.response.TrainingCourseSummaryResponse;
import com.uav.platform.modules.training.dto.response.TrainingLessonDetailResponse;
import com.uav.platform.modules.training.entity.TrainingAsset;
import com.uav.platform.modules.training.entity.TrainingDocument;
import com.uav.platform.modules.training.entity.TrainingLesson;
import com.uav.platform.modules.training.entity.TrainingLessonProgress;
import com.uav.platform.modules.training.entity.TrainingLessonResource;
import com.uav.platform.modules.training.entity.TrainingLessonSlide;
import com.uav.platform.modules.training.entity.UserTrainingProgress;
import com.uav.platform.modules.training.enums.TrainingAssetStatus;
import com.uav.platform.modules.training.enums.TrainingLessonType;
import com.uav.platform.modules.training.repository.TrainingAssetRepository;
import com.uav.platform.modules.training.repository.TrainingDocumentRepository;
import com.uav.platform.modules.training.repository.TrainingLessonProgressRepository;
import com.uav.platform.modules.training.repository.TrainingLessonRepository;
import com.uav.platform.modules.training.repository.UserTrainingProgressRepository;
import com.uav.platform.modules.training.service.impl.TrainingCourseServiceImpl;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@DisplayName("Training courses for learners")
class TrainingCourseServiceTest {

    private TrainingDocumentRepository documents;
    private TrainingLessonRepository lessons;
    private TrainingLessonProgressRepository lessonProgress;
    private UserTrainingProgressRepository courseProgress;
    private TrainingAssetRepository assets;
    private UserRepository users;
    private ObjectStorageService storage;
    private TrainingCourseServiceImpl service;

    private final Map<Long, TrainingLessonProgress> savedLessonProgress = new HashMap<>();
    private final Map<Long, UserTrainingProgress> savedRecords = new HashMap<>();
    private final Map<Object, TrainingLesson> lessonsById = new HashMap<>();
    private AppUser customer;
    private Authentication customerAuth;

    @BeforeEach
    void setUp() {
        documents = mock(TrainingDocumentRepository.class);
        lessons = mock(TrainingLessonRepository.class);
        lessonProgress = mock(TrainingLessonProgressRepository.class);
        courseProgress = mock(UserTrainingProgressRepository.class);
        assets = mock(TrainingAssetRepository.class);
        users = mock(UserRepository.class);
        storage = mock(ObjectStorageService.class);
        service =
                new TrainingCourseServiceImpl(
                        documents,
                        lessons,
                        lessonProgress,
                        courseProgress,
                        assets,
                        users,
                        new TrainingMediaUrls(storage));

        customer = user(99L, "customer01", UserRole.ROLE_PILOT);
        customerAuth = new UsernamePasswordAuthenticationToken("customer01", "x", List.of());

        // In-memory progress tables. The upsert mirrors the SQL: completion is only ever stamped,
        // the
        // position only changes when sent.
        when(lessonProgress.upsertProgress(
                        anyLong(), anyLong(), anyBoolean(), anyBoolean(), anyInt()))
                .thenAnswer(
                        inv -> {
                            long lessonId = inv.getArgument(1);
                            TrainingLessonProgress p =
                                    savedLessonProgress.computeIfAbsent(
                                            lessonId,
                                            id -> {
                                                TrainingLessonProgress created =
                                                        new TrainingLessonProgress();
                                                created.setLesson(lessonsById.get(id));
                                                return created;
                                            });
                            if ((boolean) inv.getArgument(2) && p.getCompletedAt() == null)
                                p.setCompletedAt(OffsetDateTime.now());
                            if ((boolean) inv.getArgument(3))
                                p.setPositionSeconds(inv.getArgument(4));
                            return 1;
                        });
        when(lessons.countResources(anyCollection()))
                .thenAnswer(
                        inv -> {
                            List<Object[]> rows = new ArrayList<>();
                            for (Object id : (Collection<?>) inv.getArgument(0)) {
                                TrainingLesson l = lessonsById.get(id);
                                if (l != null && !l.getResources().isEmpty())
                                    rows.add(new Object[] {id, (long) l.getResources().size()});
                            }
                            return rows;
                        });
        when(lessonProgress.findByUserIdAndLessonId(anyLong(), anyLong()))
                .thenAnswer(
                        inv -> Optional.ofNullable(savedLessonProgress.get(inv.getArgument(1))));
        when(lessonProgress.findByUserIdAndLessonIdIn(anyLong(), anyCollection()))
                .thenAnswer(
                        inv -> {
                            List<TrainingLessonProgress> found = new ArrayList<>();
                            for (Object id : (Collection<?>) inv.getArgument(1))
                                if (savedLessonProgress.containsKey(id))
                                    found.add(savedLessonProgress.get(id));
                            return found;
                        });
        when(courseProgress.save(any()))
                .thenAnswer(
                        inv -> {
                            UserTrainingProgress r = inv.getArgument(0);
                            savedRecords.put(r.getDocument().getId(), r);
                            return r;
                        });
        when(courseProgress.findByUserIdAndDocumentId(anyLong(), anyLong()))
                .thenAnswer(inv -> Optional.ofNullable(savedRecords.get(inv.getArgument(1))));
        when(courseProgress.findByUserId(anyLong()))
                .thenAnswer(inv -> new ArrayList<>(savedRecords.values()));
        when(assets.findAllById(any()))
                .thenAnswer(
                        inv -> {
                            List<TrainingAsset> found = new ArrayList<>();
                            for (Object id : (Iterable<?>) inv.getArgument(0))
                                assets.findById((Long) id).ifPresent(found::add);
                            return found;
                        });
    }

    private AppUser user(long id, String username, UserRole role) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        u.setRole(role);
        when(users.findByUsername(username)).thenReturn(Optional.of(u));
        return u;
    }

    private TrainingDocument course(long id, String portal, String checklistJson) {
        TrainingDocument doc = new TrainingDocument();
        doc.setId(id);
        doc.setCode("TRN-" + id);
        doc.setSlug("trn-" + id);
        doc.setTargetPortal(portal);
        doc.setCategory("SITE_PREP");
        doc.setLevel("STANDARD");
        doc.setTitle("Khóa " + id);
        doc.setSummary("Tóm tắt");
        doc.setContentMarkdown("# Tổng quan");
        doc.setChecklistJson(checklistJson);
        doc.setActive(true);
        when(documents.findById(id)).thenReturn(Optional.of(doc));
        when(documents.findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(portal))
                .thenReturn(List.of(doc));
        when(documents.findByCodeIgnoreCaseOrSlugIgnoreCase(doc.getCode(), doc.getCode()))
                .thenReturn(Optional.of(doc));
        return doc;
    }

    private TrainingLesson lesson(
            long id, TrainingDocument doc, TrainingLessonType type, String section) {
        TrainingLesson lesson = new TrainingLesson();
        lesson.setId(id);
        lesson.setDocument(doc);
        lesson.setType(type);
        lesson.setTitle("Bài " + id);
        lesson.setSectionTitle(section);
        lesson.setSortOrder((int) id * 10);
        lesson.setDurationMinutes(6);
        lesson.setActive(true);
        when(lessons.findById(id)).thenReturn(Optional.of(lesson));
        lessonsById.put(id, lesson);
        return lesson;
    }

    private void courseLessons(TrainingDocument doc, TrainingLesson... list) {
        when(lessons.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(doc.getId()))
                .thenReturn(List.of(list));
        when(lessons.findByDocumentIdInAndActiveTrueOrderBySortOrderAscIdAsc(anyCollection()))
                .thenReturn(List.of(list));
    }

    private UpdateLessonProgressRequest done(boolean completed) {
        return new UpdateLessonProgressRequest(completed, null);
    }

    @Test
    void percentAndCompletionRules() {
        assertEquals(0, TrainingCourseProgress.percent(0, 4, null));
        assertEquals(25, TrainingCourseProgress.percent(1, 4, "IN_PROGRESS"));
        assertEquals(66, TrainingCourseProgress.percent(2, 3, "IN_PROGRESS"));
        assertEquals(100, TrainingCourseProgress.percent(3, 3, "COMPLETED"));
        assertEquals(100, TrainingCourseProgress.percent(0, 0, "COMPLETED"));
        assertEquals(0, TrainingCourseProgress.percent(0, 0, null));
        assertTrue(TrainingCourseProgress.courseComplete(2, 2, 0, 0));
        assertFalse(TrainingCourseProgress.courseComplete(2, 2, 3, 2));
        assertTrue(TrainingCourseProgress.courseComplete(2, 2, 3, 3));
        assertFalse(TrainingCourseProgress.courseComplete(1, 2, 0, 0));
        assertFalse(TrainingCourseProgress.courseComplete(0, 0, 0, 0));
    }

    @Test
    void completingEveryLessonCompletesTheCourseRecord() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        TrainingLesson first = lesson(10, doc, TrainingLessonType.ARTICLE, "Bắt đầu");
        TrainingLesson second = lesson(11, doc, TrainingLessonType.ARTICLE, null);
        courseLessons(doc, first, second);

        TrainingLessonDetailResponse afterFirst =
                service.updateLessonProgress(10L, done(true), customerAuth);
        assertTrue(afterFirst.completed());
        assertNull(afterFirst.prevLessonId());
        assertEquals(11L, afterFirst.nextLessonId());
        assertEquals("IN_PROGRESS", savedRecords.get(1L).getStatus());
        TrainingCourseSummaryResponse half = service.listCourses("CUSTOMER", customerAuth).get(0);
        assertEquals(50, half.progressPercent());
        assertEquals(1, half.completedLessons());
        assertEquals("IN_PROGRESS", half.status());

        service.updateLessonProgress(11L, done(true), customerAuth);
        UserTrainingProgress record = savedRecords.get(1L);
        assertEquals("COMPLETED", record.getStatus());
        assertNotNull(record.getCompletedAt());
        TrainingCourseDetailResponse detail = service.getCourse("TRN-1", customerAuth);
        assertEquals(100, detail.progressPercent());
        assertEquals("COMPLETED", detail.status());
        assertEquals(2, detail.sections().size());
        assertEquals("Bắt đầu", detail.sections().get(0).title());
        assertEquals("Nội dung", detail.sections().get(1).title());

        // completed=false (sent by every video position save) never un-completes a lesson.
        TrainingLessonDetailResponse afterFalse =
                service.updateLessonProgress(11L, done(false), customerAuth);
        assertTrue(afterFalse.completed());
        assertNotNull(savedLessonProgress.get(11L).getCompletedAt());
        assertEquals("COMPLETED", savedRecords.get(1L).getStatus());
        assertNotNull(savedRecords.get(1L).getCompletedAt());
    }

    @Test
    void positionOnlySaveKeepsCompletionAndSkipsRecordSyncAndSigning() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        TrainingAsset clip = readyAsset(5L, "video/mp4");
        TrainingLesson video = lesson(10, doc, TrainingLessonType.VIDEO, null);
        video.setVideoAssetId(clip.getId());
        TrainingLesson other = lesson(11, doc, TrainingLessonType.ARTICLE, null);
        courseLessons(doc, video, other);
        when(storage.createSignedDownloadUrl(anyString(), any(Duration.class)))
                .thenReturn("https://signed-get");

        service.updateLessonProgress(10L, done(true), customerAuth);
        verify(courseProgress, times(1)).save(any());
        reset(storage);

        // Missing completed and completed=false both only move the position.
        TrainingLessonDetailResponse missing =
                service.updateLessonProgress(
                        10L, new UpdateLessonProgressRequest(null, 42), customerAuth);
        TrainingLessonDetailResponse explicitFalse =
                service.updateLessonProgress(
                        10L, new UpdateLessonProgressRequest(false, 57), customerAuth);
        assertTrue(missing.completed());
        assertEquals(42, missing.positionSeconds());
        assertTrue(explicitFalse.completed());
        assertEquals(57, explicitFalse.positionSeconds());
        assertNotNull(savedLessonProgress.get(10L).getCompletedAt());
        // Same response shape (video kind, neighbours) but no record write and no URL signing.
        assertEquals("FILE", explicitFalse.video().kind());
        assertNull(explicitFalse.video().url());
        assertEquals(11L, explicitFalse.nextLessonId());
        verify(courseProgress, times(1)).save(any());
        verifyNoInteractions(storage);
        verify(lessonProgress, never()).save(any());
    }

    @Test
    void negativePositionIsRejected() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        courseLessons(doc, lesson(10, doc, TrainingLessonType.VIDEO, null));
        assertEquals(
                "TRAINING_PROGRESS_INVALID",
                assertThrows(
                                SystemException.class,
                                () ->
                                        service.updateLessonProgress(
                                                10L,
                                                new UpdateLessonProgressRequest(null, -1),
                                                customerAuth))
                        .getCode());
        verify(lessonProgress, never())
                .upsertProgress(anyLong(), anyLong(), anyBoolean(), anyBoolean(), anyInt());
    }

    @Test
    void firstSaveCreatesTheCourseRecordThroughAnInsertThatIgnoresDuplicates() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        courseLessons(doc, lesson(10, doc, TrainingLessonType.ARTICLE, null));
        service.updateLessonProgress(10L, done(true), customerAuth);
        verify(lessonProgress).upsertProgress(eq(99L), eq(10L), eq(true), eq(false), eq(0));
        verify(courseProgress).insertIfAbsent(99L, 1L);
        assertEquals("COMPLETED", savedRecords.get(1L).getStatus());

        // The record now exists: no second insert attempt.
        service.updateLessonProgress(10L, done(true), customerAuth);
        verify(courseProgress, times(1)).insertIfAbsent(anyLong(), anyLong());
    }

    @Test
    void checklistMustAlsoBeTickedBeforeCompletion() {
        TrainingDocument doc = course(1, "CUSTOMER", "[\"A\",\"B\"]");
        TrainingLesson only = lesson(10, doc, TrainingLessonType.ARTICLE, null);
        courseLessons(doc, only);

        service.updateLessonProgress(10L, done(true), customerAuth);
        assertEquals("IN_PROGRESS", savedRecords.get(1L).getStatus());

        savedRecords.get(1L).setCheckedStepsJson("[0,1]");
        service.updateLessonProgress(10L, new UpdateLessonProgressRequest(true, 30), customerAuth);
        assertEquals("COMPLETED", savedRecords.get(1L).getStatus());
        assertEquals(30, savedLessonProgress.get(10L).getPositionSeconds());
    }

    @Test
    void completingALessonAddedLaterKeepsTheEarlierCompletion() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        TrainingLesson added = lesson(10, doc, TrainingLessonType.ARTICLE, null);
        TrainingLesson other = lesson(11, doc, TrainingLessonType.ARTICLE, null);
        courseLessons(doc, added, other);
        UserTrainingProgress record = new UserTrainingProgress();
        record.setUser(customer);
        record.setDocument(doc);
        record.setStatus("COMPLETED");
        OffsetDateTime completedAt = OffsetDateTime.parse("2025-12-01T09:00:00+07:00");
        record.setCompletedAt(completedAt);
        savedRecords.put(1L, record);

        // Only one of the two lessons added after the completion is done.
        service.updateLessonProgress(10L, done(true), customerAuth);

        assertEquals("COMPLETED", savedRecords.get(1L).getStatus());
        assertEquals(completedAt, savedRecords.get(1L).getCompletedAt());
        assertEquals("COMPLETED", service.listCourses("CUSTOMER", customerAuth).get(0).status());
    }

    @Test
    void recordStatusRule() {
        String ns = TrainingCourseProgress.NOT_STARTED;
        String ip = TrainingCourseProgress.IN_PROGRESS;
        String done = TrainingCourseProgress.COMPLETED;
        // With lessons: all lessons and the checklist.
        assertEquals(done, TrainingCourseProgress.recordStatus(null, 2, 2, 0, 0, true));
        // A completion is kept when lessons are added or steps change later.
        assertEquals(done, TrainingCourseProgress.recordStatus(done, 1, 2, 0, 0, true));
        assertEquals(ip, TrainingCourseProgress.recordStatus(null, 0, 2, 2, 2, false));
        assertEquals(done, TrainingCourseProgress.recordStatus(ip, 2, 2, 2, 2, true));
        assertEquals(ns, TrainingCourseProgress.recordStatus(null, 0, 2, 0, 0, false));
        assertEquals(done, TrainingCourseProgress.recordStatus(done, 0, 3, 0, 0, false));
        // Without lessons: checklist-only rule, and a checklist-free course keeps its status.
        assertEquals(done, TrainingCourseProgress.recordStatus(ip, 0, 0, 2, 2, false));
        assertEquals(done, TrainingCourseProgress.recordStatus(done, 0, 0, 2, 1, false));
        assertEquals(ip, TrainingCourseProgress.recordStatus(null, 0, 0, 2, 1, false));
        assertEquals(done, TrainingCourseProgress.recordStatus(done, 0, 0, 0, 0, false));
        assertEquals(ns, TrainingCourseProgress.recordStatus(null, 0, 0, 0, 0, false));
    }

    @Test
    void linkedDocumentLessonIsEmbeddedAsGooglePreview() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        TrainingLesson linked = lesson(10, doc, TrainingLessonType.DOCUMENT, null);
        linked.setDocumentUrl(
                "https://docs.google.com/presentation/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit?usp=sharing");
        TrainingLesson broken = lesson(11, doc, TrainingLessonType.DOCUMENT, null);
        broken.setDocumentUrl("https://example.com/a.pdf");
        courseLessons(doc, linked, broken);

        TrainingLessonDetailResponse detail = service.getLesson(10L, customerAuth);
        assertEquals("EMBED", detail.document().kind());
        assertEquals(
                "https://docs.google.com/presentation/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/preview",
                detail.document().url());
        assertEquals("GOOGLE", detail.document().provider());
        assertNull(detail.document().fileName());
        assertNull(detail.document().size());
        verifyNoInteractions(storage);
        assertNull(service.getLesson(11L, customerAuth).document());
    }

    @Test
    void customerCannotLoadOperationsLesson() {
        TrainingDocument ops = course(2, "OPERATIONS", "[]");
        TrainingLesson opsLesson = lesson(20, ops, TrainingLessonType.ARTICLE, null);

        SystemException ex =
                assertThrows(SystemException.class, () -> service.getLesson(20L, customerAuth));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
        assertEquals("TRAINING_LESSON_NOT_FOUND", ex.getCode());
        assertThrows(
                SystemException.class,
                () -> service.updateLessonProgress(20L, done(true), customerAuth));
        assertThrows(SystemException.class, () -> service.getCourse("TRN-2", customerAuth));

        // An operator may open it.
        user(7L, "operator01", UserRole.ROLE_OPERATOR);
        courseLessons(ops, opsLesson);
        var operator = new UsernamePasswordAuthenticationToken("operator01", "x", List.of());
        assertEquals(20L, service.getLesson(20L, operator).id());
    }

    @Test
    void hiddenLessonIsNotFoundForLearners() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        TrainingLesson hidden = lesson(10, doc, TrainingLessonType.ARTICLE, null);
        hidden.setActive(false);
        courseLessons(doc);
        assertEquals(
                "TRAINING_LESSON_NOT_FOUND",
                assertThrows(SystemException.class, () -> service.getLesson(10L, customerAuth))
                        .getCode());
    }

    @Test
    void signedUrlsFallBackToNullWithoutStorageAndExternalVideoStillWorks() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        doc.setCoverAssetId(3L);
        TrainingAsset cover = readyAsset(3L, "image/png");
        TrainingAsset clip = readyAsset(5L, "video/mp4");
        TrainingAsset slide = readyAsset(7L, "image/webp");
        TrainingLesson file = lesson(10, doc, TrainingLessonType.VIDEO, null);
        file.setVideoAssetId(clip.getId());
        TrainingLesson external = lesson(11, doc, TrainingLessonType.VIDEO, null);
        external.setVideoUrl("https://youtu.be/dQw4w9WgXcQ");
        TrainingLesson slides = lesson(12, doc, TrainingLessonType.SLIDES, null);
        slides.setSlides(new ArrayList<>(List.of(new TrainingLessonSlide(7L, "Trang 1"))));
        courseLessons(doc, file, external, slides);
        when(storage.createSignedDownloadUrl(anyString(), any(Duration.class)))
                .thenThrow(new IllegalStateException("storage not configured"));

        assertNull(service.listCourses("CUSTOMER", customerAuth).get(0).coverUrl());
        TrainingLessonDetailResponse fileLesson = service.getLesson(10L, customerAuth);
        assertEquals("FILE", fileLesson.video().kind());
        assertNull(fileLesson.video().url());
        assertEquals("video/mp4", fileLesson.video().contentType());
        TrainingLessonDetailResponse externalLesson = service.getLesson(11L, customerAuth);
        assertEquals("EXTERNAL", externalLesson.video().kind());
        assertEquals(
                "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", externalLesson.video().url());
        TrainingLessonDetailResponse slideLesson = service.getLesson(12L, customerAuth);
        assertEquals(1, slideLesson.slides().size());
        assertNull(slideLesson.slides().get(0).url());
        assertEquals("Trang 1", slideLesson.slides().get(0).caption());
        assertNull(slideLesson.video());

        reset(storage);
        when(storage.createSignedDownloadUrl(eq(clip.getObjectKey()), eq(Duration.ofHours(2))))
                .thenReturn("https://signed-get");
        assertEquals("https://signed-get", service.getLesson(10L, customerAuth).video().url());
        assertEquals(cover.getId(), doc.getCoverAssetId());
        assertNotNull(slide);
    }

    @Test
    void courseListCountsVideosAndUsesTheCallersPortal() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        TrainingLesson a = lesson(10, doc, TrainingLessonType.VIDEO, null);
        a.setVideoUrl("https://vimeo.com/76979871");
        TrainingLesson b = lesson(11, doc, TrainingLessonType.ARTICLE, null);
        courseLessons(doc, a, b);

        // A customer asking for OPERATIONS falls back to their own portal.
        List<TrainingCourseSummaryResponse> list = service.listCourses("OPERATIONS", customerAuth);
        verify(documents).findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc("CUSTOMER");
        assertEquals(1, list.size());
        assertEquals(2, list.get(0).lessonCount());
        assertEquals(1, list.get(0).videoCount());
        assertEquals("NOT_STARTED", list.get(0).status());
        assertEquals(0, list.get(0).progressPercent());
    }

    @Test
    void documentLessonAndResourcesAppearInLessonAndCourseDetail() {
        TrainingDocument doc = course(1, "CUSTOMER", "[]");
        TrainingAsset pdf = readyAsset(20L, "application/pdf");
        pdf.setFileName("huong-dan.pdf");
        pdf.setSizeBytes(123_456L);
        TrainingAsset map = readyAsset(23L, "image/png");
        map.setSizeBytes(2_000L);
        TrainingLesson guide = lesson(10, doc, TrainingLessonType.DOCUMENT, null);
        guide.setDocumentAssetId(20L);
        guide.setResources(
                new ArrayList<>(
                        List.of(
                                new TrainingLessonResource(20L, "Checklist bay.pdf"),
                                new TrainingLessonResource(23L, "Sơ đồ khu vực"))));
        TrainingLesson video = lesson(11, doc, TrainingLessonType.VIDEO, null);
        video.setVideoUrl("https://youtu.be/dQw4w9WgXcQ");
        courseLessons(doc, guide, video);
        when(storage.createSignedDownloadUrl(eq("training/20"), any(Duration.class)))
                .thenReturn("https://signed/pdf");
        when(storage.createSignedDownloadUrl(eq("training/23"), any(Duration.class)))
                .thenReturn("https://signed/png");

        TrainingLessonDetailResponse detail = service.getLesson(10L, customerAuth);
        assertEquals("DOCUMENT", detail.type());
        assertNull(detail.video());
        assertEquals("FILE", detail.document().kind());
        assertNull(detail.document().provider());
        assertEquals("https://signed/pdf", detail.document().url());
        assertEquals("huong-dan.pdf", detail.document().fileName());
        assertEquals(123_456L, detail.document().size());
        assertEquals(2, detail.resources().size());
        assertEquals("Checklist bay.pdf", detail.resources().get(0).title());
        assertEquals("application/pdf", detail.resources().get(0).contentType());
        assertEquals("https://signed/png", detail.resources().get(1).url());
        assertEquals("image/png", detail.resources().get(1).contentType());
        assertEquals(2_000L, detail.resources().get(1).size());

        TrainingLessonDetailResponse other = service.getLesson(11L, customerAuth);
        assertNull(other.document());
        assertTrue(other.resources().isEmpty());

        // Resource counts come from one grouped count query; the collections are not loaded.
        TrainingLesson spyGuide = spy(guide);
        when(lessons.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(1L))
                .thenReturn(List.of(spyGuide, video));
        TrainingCourseDetailResponse course = service.getCourse("TRN-1", customerAuth);
        verify(lessons).countResources(List.of(10L, 11L));
        verify(spyGuide, never()).getResources();
        assertEquals(1, course.documentCount());
        assertEquals(1, course.videoCount());
        assertEquals(2, course.sections().get(0).lessons().get(0).resourceCount());
        assertEquals(0, course.sections().get(0).lessons().get(1).resourceCount());
        assertEquals(1, service.listCourses("CUSTOMER", customerAuth).get(0).documentCount());
    }

    private TrainingAsset readyAsset(long id, String type) {
        TrainingAsset asset = new TrainingAsset();
        asset.setId(id);
        asset.setObjectKey("training/" + id);
        asset.setFileName("f");
        asset.setContentType(type);
        asset.setSizeBytes(10L);
        asset.setStatus(TrainingAssetStatus.READY);
        when(assets.findById(id)).thenReturn(Optional.of(asset));
        return asset;
    }
}
