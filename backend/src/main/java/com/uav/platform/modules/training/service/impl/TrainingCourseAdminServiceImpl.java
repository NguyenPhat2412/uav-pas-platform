package com.uav.platform.modules.training.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.dto.record.ObjectMetadata;
import com.uav.platform.modules.media.service.MediaUploadPolicy;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.training.dto.request.CreateTrainingAssetRequest;
import com.uav.platform.modules.training.dto.request.UpdateCourseCoverRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingLessonRequest;
import com.uav.platform.modules.training.dto.response.TrainingAssetResponse;
import com.uav.platform.modules.training.dto.response.TrainingAssetUploadResponse;
import com.uav.platform.modules.training.dto.response.TrainingLessonAdminResponse;
import com.uav.platform.modules.training.entity.TrainingAsset;
import com.uav.platform.modules.training.entity.TrainingDocument;
import com.uav.platform.modules.training.entity.TrainingLesson;
import com.uav.platform.modules.training.entity.TrainingLessonResource;
import com.uav.platform.modules.training.entity.TrainingLessonSlide;
import com.uav.platform.modules.training.enums.TrainingAssetStatus;
import com.uav.platform.modules.training.enums.TrainingLessonType;
import com.uav.platform.modules.training.repository.TrainingAssetRepository;
import com.uav.platform.modules.training.repository.TrainingDocumentRepository;
import com.uav.platform.modules.training.repository.TrainingLessonRepository;
import com.uav.platform.modules.training.service.TrainingAssetPolicy;
import com.uav.platform.modules.training.service.TrainingCourseAdminService;
import com.uav.platform.modules.training.service.TrainingMediaUrls;
import com.uav.platform.modules.training.service.TrainingVideoUrls;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrainingCourseAdminServiceImpl implements TrainingCourseAdminService {

    static final int MAX_TITLE = 220;
    static final int MAX_SECTION_TITLE = 120;
    static final int MAX_CAPTION = 300;
    static final int MAX_BODY = 100_000;
    static final int MAX_SLIDES = 60;
    static final int MAX_RESOURCES = 30;
    static final int MAX_RESOURCE_TITLE = 220;
    static final int MAX_DURATION_MINUTES = 1440;

    /** Signature lifetime of an upload URL; the upload itself must start within it. */
    static final Duration UPLOAD_VALIDITY = Duration.ofMinutes(30);

    private final TrainingDocumentRepository documents;
    private final TrainingLessonRepository lessons;
    private final TrainingAssetRepository assets;
    private final ObjectStorageService storage;
    private final TrainingMediaUrls mediaUrls;

    @Override
    @Transactional(readOnly = true)
    public List<TrainingLessonAdminResponse> listLessons(Long courseId) {
        TrainingDocument doc = course(courseId);
        List<TrainingLesson> list = lessons.findByDocumentIdOrderBySortOrderAscIdAsc(doc.getId());
        Map<Long, TrainingAsset> byId =
                loadAssets(list.stream().flatMap(l -> referencedAssets(l).stream()).toList());
        return list.stream().map(l -> toResponse(l, byId)).toList();
    }

    @Override
    @Transactional
    public TrainingLessonAdminResponse createLesson(UpsertTrainingLessonRequest request) {
        TrainingDocument doc = course(request.courseId());
        TrainingLesson lesson = new TrainingLesson();
        lesson.setDocument(doc);
        if (request.sortOrder() == null) {
            List<TrainingLesson> existing =
                    lessons.findByDocumentIdOrderBySortOrderAscIdAsc(doc.getId());
            int last =
                    existing.stream()
                            .map(TrainingLesson::getSortOrder)
                            .filter(java.util.Objects::nonNull)
                            .max(Integer::compare)
                            .orElse(0);
            lesson.setSortOrder(last + 10);
        }
        apply(lesson, request);
        return toResponse(lessons.save(lesson));
    }

    @Override
    @Transactional
    public TrainingLessonAdminResponse updateLesson(
            Long lessonId, UpsertTrainingLessonRequest request) {
        TrainingLesson lesson = lesson(lessonId);
        if (request.courseId() != null && !request.courseId().equals(lesson.getDocument().getId()))
            lesson.setDocument(course(request.courseId()));
        apply(lesson, request);
        return toResponse(lessons.save(lesson));
    }

    @Override
    @Transactional
    public void deleteLesson(Long lessonId) {
        TrainingLesson lesson = lesson(lessonId);
        lesson.setActive(false);
        lessons.save(lesson);
    }

    @Override
    @Transactional
    public void setCover(Long courseId, UpdateCourseCoverRequest request) {
        TrainingDocument doc = course(courseId);
        Long assetId = request == null ? null : request.assetId();
        if (assetId != null)
            requireReadyAsset(
                    assetId, "assetId", "Ảnh bìa phải là ảnh PNG, JPEG hoặc WebP.", "image/");
        doc.setCoverAssetId(assetId);
        documents.save(doc);
    }

    @Override
    @Transactional
    public TrainingAssetUploadResponse createAsset(
            CreateTrainingAssetRequest request, String actor) {
        long size = request.size() == null ? 0 : request.size();
        String contentType = TrainingAssetPolicy.validate(request.contentType(), size);
        String fileName = request.fileName() == null ? "" : request.fileName().trim();
        if (fileName.isEmpty())
            throw SystemException.badRequest(
                            "Vui lòng nhập tên tệp.", "TRAINING_ASSET_FILE_NAME_REQUIRED")
                    .at("fileName");
        if (fileName.length() > 255) fileName = fileName.substring(fileName.length() - 255);

        TrainingAsset asset = new TrainingAsset();
        asset.setObjectKey(TrainingAssetPolicy.objectKey(fileName));
        asset.setFileName(fileName);
        asset.setContentType(contentType);
        asset.setSizeBytes(size);
        asset.setStatus(TrainingAssetStatus.PENDING);
        asset.setUploadedBy(actor);
        asset = assets.save(asset);

        String uploadUrl;
        try {
            uploadUrl =
                    storage.createSignedUploadUrl(
                            asset.getObjectKey(), contentType, size, UPLOAD_VALIDITY);
        } catch (RuntimeException ex) {
            log.warn("Cannot sign training upload {}: {}", asset.getObjectKey(), ex.getMessage());
            throw storageUnavailable();
        }
        // The signed request pins Content-Type and refuses to overwrite an existing object, so the
        // browser must send exactly these headers (the file body supplies Content-Length).
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", contentType);
        headers.put("If-None-Match", "*");
        return new TrainingAssetUploadResponse(asset.getId(), uploadUrl, "PUT", headers);
    }

    @Override
    @Transactional
    public TrainingAssetResponse confirmAsset(Long assetId) {
        TrainingAsset asset =
                assets.findById(assetId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy tệp đào tạo.",
                                                "TRAINING_ASSET_NOT_FOUND"));
        if (asset.getStatus() == TrainingAssetStatus.READY) return toResponse(asset);
        TrainingAssetPolicy.validate(asset.getContentType(), asset.getSizeBytes());

        ObjectMetadata metadata;
        try {
            if (!storage.objectExists(asset.getObjectKey()))
                throw SystemException.conflict(
                        "Chưa tìm thấy tệp trên kho lưu trữ. Vui lòng tải tệp lên rồi xác nhận lại.",
                        "TRAINING_ASSET_NOT_UPLOADED");
            metadata = storage.metadata(asset.getObjectKey());
        } catch (SystemException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.warn("Cannot read training asset {}: {}", asset.getObjectKey(), ex.getMessage());
            throw storageUnavailable();
        }
        if (metadata == null
                || metadata.size() != asset.getSizeBytes()
                || !TrainingAssetPolicy.baseType(metadata.contentType())
                        .equals(asset.getContentType())) throw mismatch(asset);
        try {
            MediaUploadPolicy.validateHeader(
                    asset.getContentType(), storage.readHeader(asset.getObjectKey()));
        } catch (SystemException ex) {
            throw mismatch(asset);
        } catch (RuntimeException ex) {
            log.warn(
                    "Cannot read training asset header {}: {}",
                    asset.getObjectKey(),
                    ex.getMessage());
            throw storageUnavailable();
        }

        asset.setStatus(TrainingAssetStatus.READY);
        asset.setConfirmedAt(LocalDateTime.now());
        return toResponse(assets.save(asset));
    }

    /**
     * Applies and validates a lesson payload. Fields that do not belong to the lesson type are cleared, so an
     * editor switching type never leaves a stale video or slide list behind.
     */
    void apply(TrainingLesson lesson, UpsertTrainingLessonRequest request) {
        TrainingLessonType type = parseType(request.type());
        String title = request.title() == null ? "" : request.title().trim();
        if (title.isEmpty())
            throw SystemException.badRequest(
                            "Vui lòng nhập tên bài học.", "TRAINING_LESSON_TITLE_REQUIRED")
                    .at("title");
        if (title.length() > MAX_TITLE) throw tooLong("title", MAX_TITLE);
        String section =
                StringUtils.hasText(request.sectionTitle()) ? request.sectionTitle().trim() : null;
        if (section != null && section.length() > MAX_SECTION_TITLE)
            throw tooLong("sectionTitle", MAX_SECTION_TITLE);
        String body = StringUtils.hasText(request.bodyMarkdown()) ? request.bodyMarkdown() : null;
        if (body != null && body.length() > MAX_BODY) throw tooLong("bodyMarkdown", MAX_BODY);
        Integer duration = request.durationMinutes();
        if (duration != null && (duration < 0 || duration > MAX_DURATION_MINUTES))
            throw SystemException.badRequest(
                            "Thời lượng phải từ 0 đến " + MAX_DURATION_MINUTES + " phút.",
                            "TRAINING_LESSON_DURATION_INVALID")
                    .at("durationMinutes");

        String videoUrl = null;
        Long videoAssetId = null;
        Long documentAssetId = null;
        List<TrainingLessonSlide> slides = new ArrayList<>();
        List<TrainingLessonResource> resources = resources(request.resources());
        switch (type) {
            case VIDEO -> {
                boolean hasUrl = StringUtils.hasText(request.videoUrl());
                boolean hasAsset = request.videoAssetId() != null;
                if (hasUrl == hasAsset)
                    throw SystemException.badRequest(
                                    "Bài video cần đúng một nguồn: liên kết YouTube/Vimeo hoặc tệp video đã tải lên.",
                                    "TRAINING_LESSON_VIDEO_SOURCE_INVALID")
                            .at("videoUrl");
                if (hasUrl) {
                    videoUrl = request.videoUrl().trim();
                    if (videoUrl.length() > 500) throw tooLong("videoUrl", 500);
                    TrainingVideoUrls.toEmbedUrl(videoUrl);
                } else {
                    videoAssetId = request.videoAssetId();
                    requireReadyAsset(
                            videoAssetId,
                            "videoAssetId",
                            "Tệp phải là video MP4 hoặc WebM.",
                            "video/");
                }
            }
            case SLIDES -> {
                List<UpsertTrainingLessonRequest.SlideRequest> requested =
                        request.slides() == null ? List.of() : request.slides();
                if (requested.isEmpty())
                    throw SystemException.badRequest(
                                    "Bài trình chiếu cần ít nhất một ảnh.",
                                    "TRAINING_LESSON_SLIDES_REQUIRED")
                            .at("slides");
                if (requested.size() > MAX_SLIDES)
                    throw SystemException.badRequest(
                                    "Bài trình chiếu tối đa " + MAX_SLIDES + " ảnh.",
                                    "TRAINING_LESSON_TOO_MANY_SLIDES")
                            .at("slides");
                for (UpsertTrainingLessonRequest.SlideRequest slide : requested) {
                    if (slide == null || slide.assetId() == null)
                        throw SystemException.badRequest(
                                        "Mỗi trang trình chiếu cần một ảnh đã tải lên.",
                                        "TRAINING_LESSON_SLIDES_REQUIRED")
                                .at("slides");
                    String caption =
                            StringUtils.hasText(slide.caption()) ? slide.caption().trim() : null;
                    if (caption != null && caption.length() > MAX_CAPTION)
                        throw tooLong("slides", MAX_CAPTION);
                    requireReadyAsset(
                            slide.assetId(),
                            "slides",
                            "Tệp phải là ảnh PNG, JPEG hoặc WebP.",
                            "image/");
                    slides.add(new TrainingLessonSlide(slide.assetId(), caption));
                }
            }
            case DOCUMENT -> {
                documentAssetId = request.documentAssetId();
                if (documentAssetId == null)
                    throw SystemException.badRequest(
                                    "Bài tài liệu cần một tệp PDF đã tải lên.",
                                    "TRAINING_LESSON_DOCUMENT_REQUIRED")
                            .at("documentAssetId");
                requireReadyAsset(
                        documentAssetId, "documentAssetId", "Tệp phải là PDF.", "application/pdf");
            }
            case ARTICLE -> {
                if (body == null)
                    throw SystemException.badRequest(
                                    "Bài viết cần nội dung.", "TRAINING_LESSON_BODY_REQUIRED")
                            .at("bodyMarkdown");
            }
        }

        lesson.setType(type);
        lesson.setTitle(title);
        lesson.setSectionTitle(section);
        lesson.setBodyMarkdown(body);
        lesson.setVideoUrl(videoUrl);
        lesson.setVideoAssetId(videoAssetId);
        lesson.setDocumentAssetId(documentAssetId);
        if (lesson.getSlides() == null) lesson.setSlides(new ArrayList<>());
        lesson.getSlides().clear();
        lesson.getSlides().addAll(slides);
        if (lesson.getResources() == null) lesson.setResources(new ArrayList<>());
        lesson.getResources().clear();
        lesson.getResources().addAll(resources);
        if (request.sortOrder() != null) lesson.setSortOrder(request.sortOrder());
        if (duration != null) lesson.setDurationMinutes(duration);
        if (request.active() != null) lesson.setActive(request.active());
    }

    /** Downloadable files of any lesson type: READY PDFs or images, titled by the editor or the file name. */
    private List<TrainingLessonResource> resources(
            List<UpsertTrainingLessonRequest.ResourceRequest> requested) {
        List<TrainingLessonResource> result = new ArrayList<>();
        if (requested == null || requested.isEmpty()) return result;
        if (requested.size() > MAX_RESOURCES)
            throw SystemException.badRequest(
                            "Mỗi bài học tối đa " + MAX_RESOURCES + " tài nguyên.",
                            "TRAINING_LESSON_TOO_MANY_RESOURCES")
                    .at("resources");
        for (UpsertTrainingLessonRequest.ResourceRequest resource : requested) {
            if (resource == null || resource.assetId() == null)
                throw SystemException.badRequest(
                                "Mỗi tài nguyên cần một tệp đã tải lên.",
                                "TRAINING_LESSON_RESOURCE_INVALID")
                        .at("resources");
            TrainingAsset asset =
                    requireReadyAsset(
                            resource.assetId(),
                            "resources",
                            "Tài nguyên phải là tệp PDF hoặc ảnh PNG, JPEG, WebP.",
                            "application/pdf",
                            "image/");
            String title =
                    StringUtils.hasText(resource.title())
                            ? resource.title().trim()
                            : asset.getFileName();
            if (title.length() > MAX_RESOURCE_TITLE) throw tooLong("resources", MAX_RESOURCE_TITLE);
            result.add(new TrainingLessonResource(resource.assetId(), title));
        }
        return result;
    }

    public static TrainingLessonType parseType(String raw) {
        if (raw != null) {
            try {
                return TrainingLessonType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ignored) {
                // falls through to the error below
            }
        }
        throw SystemException.badRequest(
                        "Loại bài học phải là VIDEO, SLIDES, ARTICLE hoặc DOCUMENT.",
                        "TRAINING_LESSON_TYPE_INVALID")
                .at("type");
    }

    /** A READY asset whose content type starts with one of the allowed prefixes. */
    private TrainingAsset requireReadyAsset(
            Long id, String field, String typeMessage, String... allowedPrefixes) {
        TrainingAsset asset =
                assets.findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.badRequest(
                                                        "Không tìm thấy tệp đã tải lên.",
                                                        "TRAINING_ASSET_NOT_FOUND")
                                                .at(field));
        if (asset.getStatus() != TrainingAssetStatus.READY)
            throw SystemException.badRequest(
                            "Tệp chưa được xác nhận tải lên xong.", "TRAINING_ASSET_NOT_READY")
                    .at(field);
        String type = TrainingAssetPolicy.baseType(asset.getContentType());
        boolean allowed = false;
        for (String prefix : allowedPrefixes) allowed |= type.startsWith(prefix);
        if (!allowed)
            throw SystemException.badRequest(typeMessage, "TRAINING_ASSET_TYPE_MISMATCH").at(field);
        return asset;
    }

    private TrainingAssetResponse toResponse(TrainingAsset asset) {
        return new TrainingAssetResponse(
                asset.getId(),
                asset.getStatus().name(),
                asset.getContentType(),
                asset.getSizeBytes());
    }

    private TrainingLessonAdminResponse toResponse(TrainingLesson lesson) {
        return toResponse(lesson, loadAssets(referencedAssets(lesson)));
    }

    private static List<Long> referencedAssets(TrainingLesson lesson) {
        List<Long> ids = new ArrayList<>();
        lesson.getSlides().forEach(s -> ids.add(s.getAssetId()));
        lesson.getResources().forEach(r -> ids.add(r.getAssetId()));
        return ids;
    }

    private Map<Long, TrainingAsset> loadAssets(List<Long> ids) {
        Map<Long, TrainingAsset> byId = new HashMap<>();
        if (!ids.isEmpty())
            assets.findAllById(new HashSet<>(ids)).forEach(a -> byId.put(a.getId(), a));
        return byId;
    }

    private TrainingLessonAdminResponse toResponse(
            TrainingLesson lesson, Map<Long, TrainingAsset> byId) {
        return TrainingLessonAdminResponse.builder()
                .id(lesson.getId())
                .courseId(lesson.getDocument().getId())
                .sectionTitle(lesson.getSectionTitle())
                .title(lesson.getTitle())
                .type(lesson.getType().name())
                .sortOrder(lesson.getSortOrder())
                .durationMinutes(lesson.getDurationMinutes())
                .active(lesson.getActive())
                .videoUrl(lesson.getVideoUrl())
                .videoAssetId(lesson.getVideoAssetId())
                .documentAssetId(lesson.getDocumentAssetId())
                .bodyMarkdown(lesson.getBodyMarkdown())
                .slides(
                        lesson.getSlides().stream()
                                .map(
                                        s ->
                                                new TrainingLessonAdminResponse.Slide(
                                                        s.getAssetId(),
                                                        s.getCaption(),
                                                        mediaUrls.signedGet(
                                                                byId.get(s.getAssetId()))))
                                .toList())
                .resources(
                        lesson.getResources().stream()
                                .map(
                                        r ->
                                                new TrainingLessonAdminResponse.Resource(
                                                        r.getAssetId(),
                                                        r.getTitle(),
                                                        mediaUrls.signedGet(
                                                                byId.get(r.getAssetId()))))
                                .toList())
                .build();
    }

    private TrainingDocument course(Long id) {
        if (id == null) throw TrainingCourseServiceImpl.courseNotFound();
        return documents.findById(id).orElseThrow(TrainingCourseServiceImpl::courseNotFound);
    }

    private TrainingLesson lesson(Long id) {
        return lessons.findById(id).orElseThrow(TrainingCourseServiceImpl::lessonNotFound);
    }

    private SystemException mismatch(TrainingAsset asset) {
        // A signed upload refuses to overwrite, so a wrong object would block this key forever:
        // drop it and let the editor register the file again.
        try {
            storage.deleteObject(asset.getObjectKey());
        } catch (RuntimeException ex) {
            log.warn("Cannot remove mismatched training asset {}", asset.getObjectKey());
        }
        return SystemException.conflict(
                "Tệp trên kho lưu trữ không khớp loại hoặc dung lượng đã đăng ký. Vui lòng tải lại tệp.",
                "TRAINING_ASSET_MISMATCH");
    }

    private static SystemException tooLong(String field, int max) {
        return SystemException.badRequest(
                        "Không được vượt quá " + max + " ký tự.", "TRAINING_LESSON_FIELD_TOO_LONG")
                .at(field);
    }

    private static SystemException storageUnavailable() {
        return SystemException.serviceUnavailable(
                "Kho lưu trữ tệp chưa sẵn sàng. Vui lòng thử lại sau.",
                "TRAINING_STORAGE_UNAVAILABLE");
    }
}
