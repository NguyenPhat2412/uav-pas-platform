package com.uav.platform.modules.training.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.training.dto.record.TrainingCourseState;
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
import com.uav.platform.modules.training.enums.TrainingLessonType;
import com.uav.platform.modules.training.repository.TrainingAssetRepository;
import com.uav.platform.modules.training.repository.TrainingDocumentRepository;
import com.uav.platform.modules.training.repository.TrainingLessonProgressRepository;
import com.uav.platform.modules.training.repository.TrainingLessonRepository;
import com.uav.platform.modules.training.repository.UserTrainingProgressRepository;
import com.uav.platform.modules.training.service.TrainingCourseProgress;
import com.uav.platform.modules.training.service.TrainingCourseService;
import com.uav.platform.modules.training.service.TrainingMediaUrls;
import com.uav.platform.modules.training.service.TrainingVideoUrls;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.security.AuthCookieHelper;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrainingCourseServiceImpl implements TrainingCourseService {

    static final String DEFAULT_SECTION = "Nội dung";
    private static final Set<String> VALID_PORTALS = Set.of("CUSTOMER", "OPERATIONS", "ADMIN");

    private final TrainingDocumentRepository documents;
    private final TrainingLessonRepository lessons;
    private final TrainingLessonProgressRepository lessonProgress;
    private final UserTrainingProgressRepository courseProgress;
    private final TrainingAssetRepository assets;
    private final UserRepository users;
    private final TrainingMediaUrls mediaUrls;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(readOnly = true)
    public List<TrainingCourseSummaryResponse> listCourses(
            String portal, Authentication authentication) {
        AppUser user = resolveUser(authentication);
        String requested = normalizePortal(portal);
        String resolved =
                TrainingServiceImpl.portalsFor(user).contains(requested)
                        ? requested
                        : TrainingServiceImpl.defaultPortal(user);
        List<TrainingDocument> docs =
                documents.findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(resolved);
        if (docs.isEmpty()) return List.of();

        List<Long> docIds = docs.stream().map(TrainingDocument::getId).toList();
        Map<Long, List<TrainingLesson>> lessonsByDoc =
                lessons.findByDocumentIdInAndActiveTrueOrderBySortOrderAscIdAsc(docIds).stream()
                        .collect(
                                Collectors.groupingBy(
                                        l -> l.getDocument().getId(),
                                        LinkedHashMap::new,
                                        Collectors.toList()));
        List<Long> lessonIds =
                lessonsByDoc.values().stream()
                        .flatMap(List::stream)
                        .map(TrainingLesson::getId)
                        .toList();
        Map<Long, TrainingLessonProgress> progress = loadLessonProgress(user, lessonIds);
        Map<Long, UserTrainingProgress> records = new HashMap<>();
        if (user != null)
            for (UserTrainingProgress record : courseProgress.findByUserId(user.getId()))
                if (record.getDocument() != null) records.put(record.getDocument().getId(), record);
        Map<Long, TrainingAsset> covers =
                loadAssets(
                        docs.stream()
                                .map(TrainingDocument::getCoverAssetId)
                                .filter(java.util.Objects::nonNull)
                                .toList());

        List<TrainingCourseSummaryResponse> result = new ArrayList<>();
        for (TrainingDocument doc : docs) {
            TrainingCourseState state =
                    new TrainingCourseState(
                            doc,
                            lessonsByDoc.getOrDefault(doc.getId(), List.of()),
                            progress,
                            records.get(doc.getId()));
            result.add(summary(state, mediaUrls.signedGet(covers.get(doc.getCoverAssetId()))));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public TrainingCourseDetailResponse getCourse(
            String codeOrSlug, Authentication authentication) {
        if (!StringUtils.hasText(codeOrSlug)) throw courseNotFound();
        String key = codeOrSlug.trim();
        TrainingDocument doc =
                documents
                        .findByCodeIgnoreCaseOrSlugIgnoreCase(key, key)
                        .orElseThrow(TrainingCourseServiceImpl::courseNotFound);
        AppUser user = resolveUser(authentication);
        if (!readable(doc, user)) throw courseNotFound();
        TrainingCourseState state = loadState(doc, user);
        TrainingCourseSummaryResponse s = summary(state, coverUrl(doc));

        List<TrainingCourseDetailResponse.Section> sections = new ArrayList<>();
        Map<String, List<TrainingCourseDetailResponse.LessonItem>> bySection =
                new LinkedHashMap<>();
        for (TrainingLesson lesson : state.lessons()) {
            bySection
                    .computeIfAbsent(sectionTitle(lesson), k -> new ArrayList<>())
                    .add(
                            new TrainingCourseDetailResponse.LessonItem(
                                    lesson.getId(),
                                    lesson.getTitle(),
                                    lesson.getType().name(),
                                    lesson.getDurationMinutes(),
                                    isCompleted(state.progress().get(lesson.getId())),
                                    lesson.getResources() == null
                                            ? 0
                                            : lesson.getResources().size()));
        }
        bySection.forEach(
                (title, items) ->
                        sections.add(new TrainingCourseDetailResponse.Section(title, items)));

        return TrainingCourseDetailResponse.builder()
                .id(s.id())
                .code(s.code())
                .slug(s.slug())
                .title(s.title())
                .summary(s.summary())
                .category(s.category())
                .level(s.level())
                .targetPortal(s.targetPortal())
                .isMandatory(s.isMandatory())
                .estimatedMinutes(s.estimatedMinutes())
                .coverUrl(s.coverUrl())
                .lessonCount(s.lessonCount())
                .videoCount(s.videoCount())
                .documentCount(s.documentCount())
                .completedLessons(s.completedLessons())
                .progressPercent(s.progressPercent())
                .status(s.status())
                .overviewMarkdown(doc.getContentMarkdown())
                .checklistSteps(
                        parseList(doc.getChecklistJson(), new TypeReference<List<String>>() {}))
                .checkedSteps(
                        state.record() == null
                                ? List.of()
                                : parseList(
                                        state.record().getCheckedStepsJson(),
                                        new TypeReference<List<Integer>>() {}))
                .sections(sections)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TrainingCourseSummaryResponse getCourseSummary(
            Long courseId, Authentication authentication) {
        TrainingDocument doc =
                documents.findById(courseId).orElseThrow(TrainingCourseServiceImpl::courseNotFound);
        // Authoring callers already hold PERMISSION_MANAGE, so the portal rule does not apply here.
        return summary(loadState(doc, resolveUser(authentication)), coverUrl(doc));
    }

    @Override
    @Transactional(readOnly = true)
    public TrainingLessonDetailResponse getLesson(Long lessonId, Authentication authentication) {
        AppUser user = resolveUser(authentication);
        TrainingLesson lesson = readableLesson(lessonId, user);
        TrainingLessonProgress progress =
                user == null
                        ? null
                        : lessonProgress
                                .findByUserIdAndLessonId(user.getId(), lesson.getId())
                                .orElse(null);
        return lessonDetail(lesson, progress);
    }

    @Override
    @Transactional
    public TrainingLessonDetailResponse updateLessonProgress(
            Long lessonId, UpdateLessonProgressRequest request, Authentication authentication) {
        AppUser user = resolveUserRequired(authentication);
        TrainingLesson lesson = readableLesson(lessonId, user);
        TrainingLessonProgress progress =
                lessonProgress
                        .findByUserIdAndLessonId(user.getId(), lesson.getId())
                        .orElseGet(
                                () -> {
                                    TrainingLessonProgress created = new TrainingLessonProgress();
                                    created.setUser(user);
                                    created.setLesson(lesson);
                                    return created;
                                });
        boolean uncompleted = false;
        if (request != null && request.completed() != null) {
            if (request.completed()) {
                if (progress.getCompletedAt() == null)
                    progress.setCompletedAt(OffsetDateTime.now());
            } else {
                uncompleted = progress.getCompletedAt() != null;
                progress.setCompletedAt(null);
            }
        }
        if (request != null && request.positionSeconds() != null) {
            if (request.positionSeconds() < 0)
                throw SystemException.badRequest(
                                "Vị trí video không hợp lệ.", "TRAINING_PROGRESS_INVALID")
                        .at("positionSeconds");
            progress.setPositionSeconds(request.positionSeconds());
        }
        TrainingLessonProgress saved = lessonProgress.save(progress);
        syncCourseRecord(lesson.getDocument(), user, uncompleted);
        return lessonDetail(lesson, saved);
    }

    /**
     * Keeps the existing course record in step with lesson progress: every active lesson done and the
     * checklist (if any) fully ticked marks it COMPLETED, so the old overview counters stay correct.
     */
    private void syncCourseRecord(TrainingDocument doc, AppUser user, boolean lessonUncompleted) {
        TrainingCourseState state = loadState(doc, user);
        List<String> checklist =
                parseList(doc.getChecklistJson(), new TypeReference<List<String>>() {});
        UserTrainingProgress record = state.record();
        List<Integer> checked =
                record == null
                        ? List.of()
                        : parseList(
                                record.getCheckedStepsJson(),
                                new TypeReference<List<Integer>>() {});
        boolean complete =
                TrainingCourseProgress.courseComplete(
                        state.completedLessons(),
                        state.lessons().size(),
                        checklist.size(),
                        new HashSet<>(checked).size());
        if (record == null) {
            record = new UserTrainingProgress();
            record.setUser(user);
            record.setDocument(doc);
            record.setStatus(TrainingCourseProgress.NOT_STARTED);
        }
        String next =
                TrainingCourseProgress.nextRecordStatus(
                        record.getStatus(), complete, lessonUncompleted);
        record.setStatus(next);
        record.setLastViewedAt(OffsetDateTime.now());
        if (TrainingCourseProgress.COMPLETED.equals(next)) {
            if (record.getCompletedAt() == null) record.setCompletedAt(OffsetDateTime.now());
        } else record.setCompletedAt(null);
        courseProgress.save(record);
    }

    private TrainingLesson readableLesson(Long lessonId, AppUser user) {
        TrainingLesson lesson =
                lessons.findById(lessonId).orElseThrow(TrainingCourseServiceImpl::lessonNotFound);
        TrainingDocument doc = lesson.getDocument();
        if (doc == null || !readable(doc, user)) throw lessonNotFound();
        if (!Boolean.TRUE.equals(lesson.getActive()) && !isAdmin(user)) throw lessonNotFound();
        return lesson;
    }

    private TrainingLessonDetailResponse lessonDetail(
            TrainingLesson lesson, TrainingLessonProgress progress) {
        TrainingDocument doc = lesson.getDocument();
        List<TrainingLesson> ordered =
                lessons.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(doc.getId());
        Long prev = null;
        Long next = null;
        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).getId().equals(lesson.getId())) {
                if (i > 0) prev = ordered.get(i - 1).getId();
                if (i + 1 < ordered.size()) next = ordered.get(i + 1).getId();
                break;
            }
        }

        TrainingLessonDetailResponse.Video video = null;
        TrainingLessonDetailResponse.Document document = null;
        List<TrainingLessonDetailResponse.Slide> slides = List.of();
        List<TrainingLessonResource> storedResources =
                lesson.getResources() == null ? List.of() : lesson.getResources();
        List<TrainingLessonSlide> stored =
                lesson.getType() == TrainingLessonType.SLIDES && lesson.getSlides() != null
                        ? lesson.getSlides()
                        : List.of();
        List<Long> assetIds = new ArrayList<>();
        stored.forEach(s -> assetIds.add(s.getAssetId()));
        storedResources.forEach(r -> assetIds.add(r.getAssetId()));
        if (lesson.getType() == TrainingLessonType.DOCUMENT && lesson.getDocumentAssetId() != null)
            assetIds.add(lesson.getDocumentAssetId());
        Map<Long, TrainingAsset> byId = loadAssets(assetIds);

        if (lesson.getType() == TrainingLessonType.VIDEO) video = video(lesson);
        if (lesson.getType() == TrainingLessonType.DOCUMENT) {
            TrainingAsset pdf =
                    lesson.getDocumentAssetId() == null
                            ? null
                            : byId.get(lesson.getDocumentAssetId());
            if (pdf != null)
                document =
                        new TrainingLessonDetailResponse.Document(
                                mediaUrls.signedGet(pdf), pdf.getFileName(), pdf.getSizeBytes());
        }
        if (lesson.getType() == TrainingLessonType.SLIDES) {
            slides =
                    stored.stream()
                            .map(
                                    s ->
                                            new TrainingLessonDetailResponse.Slide(
                                                    mediaUrls.signedGet(byId.get(s.getAssetId())),
                                                    s.getCaption()))
                            .toList();
        }

        return TrainingLessonDetailResponse.builder()
                .id(lesson.getId())
                .courseCode(doc.getCode())
                .courseSlug(doc.getSlug())
                .title(lesson.getTitle())
                .type(lesson.getType().name())
                .durationMinutes(lesson.getDurationMinutes())
                .video(video)
                .slides(slides)
                .document(document)
                .resources(
                        storedResources.stream()
                                .filter(r -> byId.containsKey(r.getAssetId()))
                                .map(
                                        r -> {
                                            TrainingAsset a = byId.get(r.getAssetId());
                                            return new TrainingLessonDetailResponse.Resource(
                                                    r.getTitle(),
                                                    mediaUrls.signedGet(a),
                                                    a.getContentType(),
                                                    a.getSizeBytes());
                                        })
                                .toList())
                .bodyMarkdown(lesson.getBodyMarkdown())
                .completed(isCompleted(progress))
                .positionSeconds(
                        progress == null || progress.getPositionSeconds() == null
                                ? 0
                                : progress.getPositionSeconds())
                .prevLessonId(prev)
                .nextLessonId(next)
                .build();
    }

    private TrainingLessonDetailResponse.Video video(TrainingLesson lesson) {
        if (lesson.getVideoAssetId() != null) {
            TrainingAsset asset = assets.findById(lesson.getVideoAssetId()).orElse(null);
            return TrainingLessonDetailResponse.Video.file(
                    mediaUrls.signedGet(asset), asset == null ? null : asset.getContentType());
        }
        if (StringUtils.hasText(lesson.getVideoUrl())) {
            try {
                return TrainingLessonDetailResponse.Video.external(
                        TrainingVideoUrls.toEmbedUrl(lesson.getVideoUrl()));
            } catch (SystemException unsupported) {
                return null;
            }
        }
        return null;
    }

    private TrainingCourseState loadState(TrainingDocument doc, AppUser user) {
        List<TrainingLesson> courseLessons =
                lessons.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(doc.getId());
        Map<Long, TrainingLessonProgress> progress =
                loadLessonProgress(
                        user, courseLessons.stream().map(TrainingLesson::getId).toList());
        UserTrainingProgress record =
                user == null
                        ? null
                        : courseProgress
                                .findByUserIdAndDocumentId(user.getId(), doc.getId())
                                .orElse(null);
        return new TrainingCourseState(doc, courseLessons, progress, record);
    }

    private TrainingCourseSummaryResponse summary(TrainingCourseState state, String coverUrl) {
        TrainingDocument doc = state.doc();
        int lessonCount = state.lessons().size();
        int completed = state.completedLessons();
        String recordStatus = state.record() == null ? null : state.record().getStatus();
        return TrainingCourseSummaryResponse.builder()
                .id(doc.getId())
                .code(doc.getCode())
                .slug(doc.getSlug())
                .title(doc.getTitle())
                .summary(doc.getSummary())
                .category(doc.getCategory())
                .level(doc.getLevel())
                .targetPortal(doc.getTargetPortal())
                .isMandatory(doc.getIsMandatory())
                .estimatedMinutes(doc.getEstimatedMinutes())
                .coverUrl(coverUrl)
                .lessonCount(lessonCount)
                .videoCount(
                        (int)
                                state.lessons().stream()
                                        .filter(l -> l.getType() == TrainingLessonType.VIDEO)
                                        .count())
                .documentCount(
                        (int)
                                state.lessons().stream()
                                        .filter(l -> l.getType() == TrainingLessonType.DOCUMENT)
                                        .count())
                .completedLessons(completed)
                .progressPercent(
                        TrainingCourseProgress.percent(completed, lessonCount, recordStatus))
                .status(TrainingCourseProgress.status(recordStatus, state.anyActivity()))
                .build();
    }

    private String coverUrl(TrainingDocument doc) {
        if (doc.getCoverAssetId() == null) return null;
        return mediaUrls.signedGet(assets.findById(doc.getCoverAssetId()).orElse(null));
    }

    private Map<Long, TrainingLessonProgress> loadLessonProgress(
            AppUser user, Collection<Long> lessonIds) {
        if (user == null || lessonIds.isEmpty()) return Collections.emptyMap();
        return lessonProgress.findByUserIdAndLessonIdIn(user.getId(), lessonIds).stream()
                .collect(
                        Collectors.toMap(
                                p -> p.getLesson().getId(), Function.identity(), (a, b) -> a));
    }

    private Map<Long, TrainingAsset> loadAssets(Collection<Long> ids) {
        if (ids.isEmpty()) return Collections.emptyMap();
        Map<Long, TrainingAsset> map = new HashMap<>();
        for (TrainingAsset asset : assets.findAllById(new HashSet<>(ids)))
            map.put(asset.getId(), asset);
        return map;
    }

    /** Same rule as the document endpoints: admins see drafts; everyone else needs an active course. */
    static boolean readable(TrainingDocument doc, AppUser user) {
        boolean visible = isAdmin(user) || Boolean.TRUE.equals(doc.getActive());
        return visible && TrainingServiceImpl.portalsFor(user).contains(doc.getTargetPortal());
    }

    static String sectionTitle(TrainingLesson lesson) {
        return StringUtils.hasText(lesson.getSectionTitle())
                ? lesson.getSectionTitle().trim()
                : DEFAULT_SECTION;
    }

    private static boolean isAdmin(AppUser user) {
        return user != null && user.getRole() == UserRole.ROLE_ADMIN;
    }

    private static boolean isCompleted(TrainingLessonProgress progress) {
        return TrainingCourseState.completed(progress);
    }

    private static String normalizePortal(String portal) {
        if (!StringUtils.hasText(portal)) return "CUSTOMER";
        String candidate = portal.trim().toUpperCase(Locale.ROOT);
        return VALID_PORTALS.contains(candidate) ? candidate : "CUSTOMER";
    }

    private <T> List<T> parseList(String json, TypeReference<List<T>> type) {
        if (!StringUtils.hasText(json)) return List.of();
        try {
            List<T> list = objectMapper.readValue(json, type);
            return list == null ? List.of() : list;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private AppUser resolveUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return null;
        String username = authentication.getName();
        if (!StringUtils.hasText(username)) return null;
        return users.findByUsername(username).or(() -> users.findByEmail(username)).orElse(null);
    }

    private AppUser resolveUserRequired(Authentication authentication) {
        String username = AuthCookieHelper.requireAuthenticatedUsername(authentication);
        return users.findByUsername(username)
                .or(() -> users.findByEmail(username))
                .orElseThrow(() -> SystemException.notFound("Authenticated user not found"));
    }

    static SystemException courseNotFound() {
        return SystemException.notFound("Không tìm thấy khóa học.", "TRAINING_COURSE_NOT_FOUND");
    }

    static SystemException lessonNotFound() {
        return SystemException.notFound("Không tìm thấy bài học.", "TRAINING_LESSON_NOT_FOUND");
    }
}
