package com.uav.platform.modules.training.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.dto.record.ObjectMetadata;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.training.dto.request.CreateTrainingAssetRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingLessonRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingLessonRequest.ResourceRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingLessonRequest.SlideRequest;
import com.uav.platform.modules.training.dto.response.TrainingAssetResponse;
import com.uav.platform.modules.training.dto.response.TrainingAssetUploadResponse;
import com.uav.platform.modules.training.dto.response.TrainingLessonAdminResponse;
import com.uav.platform.modules.training.entity.TrainingAsset;
import com.uav.platform.modules.training.entity.TrainingDocument;
import com.uav.platform.modules.training.entity.TrainingLesson;
import com.uav.platform.modules.training.entity.TrainingLessonSlide;
import com.uav.platform.modules.training.enums.TrainingAssetStatus;
import com.uav.platform.modules.training.enums.TrainingLessonType;
import com.uav.platform.modules.training.repository.TrainingAssetRepository;
import com.uav.platform.modules.training.repository.TrainingDocumentRepository;
import com.uav.platform.modules.training.repository.TrainingLessonRepository;
import com.uav.platform.modules.training.service.impl.TrainingCourseAdminServiceImpl;

import org.hibernate.annotations.BatchSize;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;

@DisplayName("Training course authoring")
class TrainingCourseAdminServiceTest {

    private static final byte[] MP4_HEADER = {0, 0, 0, 24, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};

    private TrainingDocumentRepository documents;
    private TrainingLessonRepository lessons;
    private TrainingAssetRepository assets;
    private ObjectStorageService storage;
    private TrainingCourseRecords records;
    private TrainingCourseAdminServiceImpl service;
    private TrainingDocument course;

    @BeforeEach
    void setUp() {
        documents = mock(TrainingDocumentRepository.class);
        lessons = mock(TrainingLessonRepository.class);
        assets = mock(TrainingAssetRepository.class);
        storage = mock(ObjectStorageService.class);
        records = mock(TrainingCourseRecords.class);
        service =
                new TrainingCourseAdminServiceImpl(
                        documents,
                        lessons,
                        assets,
                        storage,
                        new TrainingMediaUrls(storage),
                        records);
        course = new TrainingDocument();
        course.setId(1L);
        course.setTargetPortal("CUSTOMER");
        when(documents.findById(1L)).thenReturn(Optional.of(course));
        when(lessons.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assets.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assets.findAllById(any()))
                .thenAnswer(
                        inv -> {
                            List<TrainingAsset> found = new ArrayList<>();
                            for (Object id : (Collection<?>) inv.getArgument(0))
                                assets.findById((Long) id).ifPresent(found::add);
                            return found;
                        });
    }

    private TrainingAsset asset(long id, String type, TrainingAssetStatus status) {
        TrainingAsset a = new TrainingAsset();
        a.setId(id);
        a.setObjectKey("training/key-" + id);
        a.setFileName("f");
        a.setContentType(type);
        a.setSizeBytes(1000L);
        a.setStatus(status);
        when(assets.findById(id)).thenReturn(Optional.of(a));
        return a;
    }

    private UpsertTrainingLessonRequest.UpsertTrainingLessonRequestBuilder lesson(String type) {
        return UpsertTrainingLessonRequest.builder().courseId(1L).title("Bài 1").type(type);
    }

    private String errorCode(Runnable call) {
        return assertThrows(SystemException.class, call::run).getCode();
    }

    @Test
    void unknownLessonTypeIsRejected() {
        assertEquals(
                "TRAINING_LESSON_TYPE_INVALID",
                errorCode(() -> service.createLesson(lesson("PODCAST").bodyMarkdown("x").build())));
        assertEquals(
                TrainingLessonType.SLIDES, TrainingCourseAdminServiceImpl.parseType(" slides "));
    }

    @Test
    void videoNeedsExactlyOneSource() {
        asset(5, "video/mp4", TrainingAssetStatus.READY);
        assertEquals(
                "TRAINING_LESSON_VIDEO_SOURCE_INVALID",
                errorCode(() -> service.createLesson(lesson("VIDEO").build())));
        assertEquals(
                "TRAINING_LESSON_VIDEO_SOURCE_INVALID",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("VIDEO")
                                                .videoUrl("https://youtu.be/dQw4w9WgXcQ")
                                                .videoAssetId(5L)
                                                .build())));
        assertEquals(
                "TRAINING_VIDEO_URL_UNSUPPORTED",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("VIDEO")
                                                .videoUrl("https://evil.example/v.mp4")
                                                .build())));
    }

    @Test
    void videoAssetMustBeReadyVideo() {
        asset(5, "video/mp4", TrainingAssetStatus.PENDING);
        asset(6, "image/png", TrainingAssetStatus.READY);
        assertEquals(
                "TRAINING_ASSET_NOT_READY",
                errorCode(() -> service.createLesson(lesson("VIDEO").videoAssetId(5L).build())));
        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(() -> service.createLesson(lesson("VIDEO").videoAssetId(6L).build())));
    }

    @Test
    void slidesNeedReadyImagesAndAtMostSixty() {
        asset(7, "image/png", TrainingAssetStatus.READY);
        asset(8, "video/mp4", TrainingAssetStatus.READY);
        asset(9, "image/webp", TrainingAssetStatus.PENDING);
        assertEquals(
                "TRAINING_LESSON_SLIDES_REQUIRED",
                errorCode(() -> service.createLesson(lesson("SLIDES").slides(List.of()).build())));
        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("SLIDES")
                                                .slides(List.of(new SlideRequest(8L, null)))
                                                .build())));
        assertEquals(
                "TRAINING_ASSET_NOT_READY",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("SLIDES")
                                                .slides(List.of(new SlideRequest(9L, null)))
                                                .build())));
        List<SlideRequest> tooMany =
                IntStream.range(0, 61).mapToObj(i -> new SlideRequest(7L, null)).toList();
        assertEquals(
                "TRAINING_LESSON_TOO_MANY_SLIDES",
                errorCode(() -> service.createLesson(lesson("SLIDES").slides(tooMany).build())));
        assertEquals(
                "TRAINING_LESSON_FIELD_TOO_LONG",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("SLIDES")
                                                .slides(
                                                        List.of(
                                                                new SlideRequest(
                                                                        7L, "x".repeat(301))))
                                                .build())));

        TrainingLessonAdminResponse ok =
                service.createLesson(
                        lesson("SLIDES")
                                .slides(
                                        List.of(
                                                new SlideRequest(7L, " Bước 1 "),
                                                new SlideRequest(7L, null)))
                                .build());
        assertEquals(2, ok.slides().size());
        assertEquals("Bước 1", ok.slides().get(0).caption());
    }

    @Test
    void articleNeedsBodyAndLengthsAreChecked() {
        assertEquals(
                "TRAINING_LESSON_BODY_REQUIRED",
                errorCode(
                        () -> service.createLesson(lesson("ARTICLE").bodyMarkdown("  ").build())));
        assertEquals(
                "TRAINING_LESSON_FIELD_TOO_LONG",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("ARTICLE")
                                                .bodyMarkdown("x".repeat(100_001))
                                                .build())));
        assertEquals(
                "TRAINING_LESSON_FIELD_TOO_LONG",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("ARTICLE")
                                                .title("t".repeat(221))
                                                .bodyMarkdown("x")
                                                .build())));
        assertEquals(
                "TRAINING_LESSON_FIELD_TOO_LONG",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("ARTICLE")
                                                .sectionTitle("s".repeat(121))
                                                .bodyMarkdown("x")
                                                .build())));
    }

    @Test
    void switchingTypeClearsFieldsOfTheOldType() {
        TrainingLesson existing = new TrainingLesson();
        existing.setId(10L);
        existing.setDocument(course);
        existing.setType(TrainingLessonType.VIDEO);
        existing.setVideoUrl("https://youtu.be/dQw4w9WgXcQ");
        existing.setSlides(new ArrayList<>(List.of(new TrainingLessonSlide(7L, "old"))));
        when(lessons.findById(10L)).thenReturn(Optional.of(existing));

        TrainingLessonAdminResponse updated =
                service.updateLesson(
                        10L,
                        lesson("ARTICLE")
                                .bodyMarkdown("# Nội dung")
                                .videoUrl("https://youtu.be/dQw4w9WgXcQ")
                                .build());

        assertEquals("ARTICLE", updated.type());
        assertNull(updated.videoUrl());
        assertNull(updated.videoAssetId());
        assertTrue(updated.slides().isEmpty());
        assertEquals("# Nội dung", updated.bodyMarkdown());
    }

    @Test
    void externalVideoIsStoredAsEnteredAndAppendedAfterLastLesson() {
        TrainingLesson last = new TrainingLesson();
        last.setSortOrder(30);
        when(lessons.findByDocumentIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of(last));
        TrainingLessonAdminResponse created =
                service.createLesson(
                        lesson("video").videoUrl(" https://youtu.be/dQw4w9WgXcQ ").build());
        assertEquals("https://youtu.be/dQw4w9WgXcQ", created.videoUrl());
        assertEquals(40, created.sortOrder());
        assertEquals("VIDEO", created.type());
    }

    @Test
    void createAssetValidatesTypeAndSizeAndSignsUnderTraining() {
        assertEquals(
                "TRAINING_ASSET_TYPE_UNSUPPORTED",
                errorCode(
                        () ->
                                service.createAsset(
                                        new CreateTrainingAssetRequest(
                                                "a.zip", "application/zip", 10L),
                                        "admin")));
        assertEquals(
                "TRAINING_ASSET_SIZE_INVALID",
                errorCode(
                        () ->
                                service.createAsset(
                                        new CreateTrainingAssetRequest(
                                                "a.png", "image/png", 10_000_001L),
                                        "admin")));
        assertEquals(
                "TRAINING_ASSET_SIZE_INVALID",
                errorCode(
                        () ->
                                service.createAsset(
                                        new CreateTrainingAssetRequest(
                                                "a.mp4", "video/mp4", 500_000_001L),
                                        "admin")));

        when(storage.createSignedUploadUrl(
                        anyString(), eq("video/mp4"), eq(12L), any(Duration.class)))
                .thenReturn("https://signed-put");
        TrainingAssetUploadResponse upload =
                service.createAsset(
                        new CreateTrainingAssetRequest("Giới thiệu bay.mp4", "video/mp4", 12L),
                        "admin");
        assertEquals("https://signed-put", upload.uploadUrl());
        assertEquals("PUT", upload.method());
        assertEquals("video/mp4", upload.headers().get("Content-Type"));
        verify(assets)
                .save(
                        argThat(
                                (TrainingAsset a) ->
                                        a.getObjectKey()
                                                        .matches(
                                                                "training/[0-9a-f-]{36}-Gi_i_thi_u_bay\\.mp4")
                                                && a.getStatus() == TrainingAssetStatus.PENDING));
    }

    @Test
    void confirmRejectsObjectWhoseSizeOrTypeDiffers() {
        TrainingAsset a = asset(5, "video/mp4", TrainingAssetStatus.PENDING);
        when(storage.objectExists(a.getObjectKey())).thenReturn(true);
        when(storage.metadata(a.getObjectKey())).thenReturn(new ObjectMetadata(999L, "video/mp4"));

        SystemException sizeMismatch =
                assertThrows(SystemException.class, () -> service.confirmAsset(5L));
        assertEquals("TRAINING_ASSET_MISMATCH", sizeMismatch.getCode());
        assertEquals(TrainingAssetStatus.PENDING, a.getStatus());

        when(storage.metadata(a.getObjectKey())).thenReturn(new ObjectMetadata(1000L, "image/png"));
        assertEquals("TRAINING_ASSET_MISMATCH", errorCode(() -> service.confirmAsset(5L)));
        assertEquals(TrainingAssetStatus.PENDING, a.getStatus());
        verify(storage, times(2)).deleteObject(a.getObjectKey());
    }

    @Test
    void confirmRequiresUploadedObjectAndMarksReady() {
        TrainingAsset a = asset(5, "video/mp4", TrainingAssetStatus.PENDING);
        when(storage.objectExists(a.getObjectKey())).thenReturn(false);
        assertEquals("TRAINING_ASSET_NOT_UPLOADED", errorCode(() -> service.confirmAsset(5L)));

        when(storage.objectExists(a.getObjectKey())).thenReturn(true);
        when(storage.metadata(a.getObjectKey())).thenReturn(new ObjectMetadata(1000L, "video/mp4"));
        when(storage.readHeader(a.getObjectKey())).thenReturn(MP4_HEADER);
        TrainingAssetResponse ready = service.confirmAsset(5L);
        assertEquals("READY", ready.status());
        assertEquals(1000L, ready.size());
        assertEquals("video/mp4", ready.contentType());
        assertNotNull(a.getConfirmedAt());
    }

    @Test
    void confirmRejectsContentThatIsNotTheDeclaredFormat() {
        TrainingAsset a = asset(5, "video/mp4", TrainingAssetStatus.PENDING);
        when(storage.objectExists(a.getObjectKey())).thenReturn(true);
        when(storage.metadata(a.getObjectKey())).thenReturn(new ObjectMetadata(1000L, "video/mp4"));
        when(storage.readHeader(a.getObjectKey())).thenReturn(new byte[] {'<', 'h', 't', 'm', 'l'});
        assertEquals("TRAINING_ASSET_MISMATCH", errorCode(() -> service.confirmAsset(5L)));
        assertEquals(TrainingAssetStatus.PENDING, a.getStatus());
    }

    @Test
    void deleteHidesLessonAndCoverNeedsReadyImage() {
        TrainingLesson existing = new TrainingLesson();
        existing.setId(10L);
        existing.setDocument(course);
        when(lessons.findById(10L)).thenReturn(Optional.of(existing));
        service.deleteLesson(10L);
        assertFalse(existing.getActive());

        asset(5, "video/mp4", TrainingAssetStatus.READY);
        asset(7, "image/jpeg", TrainingAssetStatus.READY);
        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(
                        () ->
                                service.setCover(
                                        1L,
                                        new com.uav.platform.modules.training.dto.request
                                                .UpdateCourseCoverRequest(5L))));
        service.setCover(
                1L, new com.uav.platform.modules.training.dto.request.UpdateCourseCoverRequest(7L));
        assertEquals(7L, course.getCoverAssetId());
        service.setCover(1L, null);
        assertNull(course.getCoverAssetId());
    }

    @Test
    void documentLessonNeedsReadyPdf() {
        asset(20, "application/pdf", TrainingAssetStatus.READY);
        asset(21, "application/pdf", TrainingAssetStatus.PENDING);
        asset(22, "image/png", TrainingAssetStatus.READY);
        assertEquals(
                "TRAINING_LESSON_DOCUMENT_REQUIRED",
                errorCode(() -> service.createLesson(lesson("DOCUMENT").build())));
        assertEquals(
                "TRAINING_ASSET_NOT_READY",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("DOCUMENT").documentAssetId(21L).build())));
        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("DOCUMENT").documentAssetId(22L).build())));
        assertEquals(
                "TRAINING_ASSET_NOT_FOUND",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("DOCUMENT").documentAssetId(99L).build())));

        TrainingLessonAdminResponse ok =
                service.createLesson(lesson("document").documentAssetId(20L).build());
        assertEquals("DOCUMENT", ok.type());
        assertEquals(20L, ok.documentAssetId());

        // Switching away from DOCUMENT drops the PDF.
        TrainingLesson existing = new TrainingLesson();
        existing.setId(30L);
        existing.setDocument(course);
        existing.setType(TrainingLessonType.DOCUMENT);
        existing.setDocumentAssetId(20L);
        when(lessons.findById(30L)).thenReturn(Optional.of(existing));
        assertNull(
                service.updateLesson(
                                30L,
                                lesson("ARTICLE").bodyMarkdown("x").documentAssetId(20L).build())
                        .documentAssetId());
    }

    @Test
    void resourcesMustBeReadyPdfOrImageOnAnyLessonType() {
        TrainingAsset pdf = asset(20, "application/pdf", TrainingAssetStatus.READY);
        pdf.setFileName("Checklist bay.pdf");
        asset(23, "image/jpeg", TrainingAssetStatus.READY);
        asset(24, "video/mp4", TrainingAssetStatus.READY);
        asset(25, "application/pdf", TrainingAssetStatus.PENDING);

        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("ARTICLE")
                                                .bodyMarkdown("x")
                                                .resources(List.of(new ResourceRequest(24L, "v")))
                                                .build())));
        assertEquals(
                "TRAINING_ASSET_NOT_READY",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("ARTICLE")
                                                .bodyMarkdown("x")
                                                .resources(List.of(new ResourceRequest(25L, "p")))
                                                .build())));
        List<ResourceRequest> tooMany =
                IntStream.range(0, 31).mapToObj(i -> new ResourceRequest(20L, null)).toList();
        assertEquals(
                "TRAINING_LESSON_TOO_MANY_RESOURCES",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("ARTICLE")
                                                .bodyMarkdown("x")
                                                .resources(tooMany)
                                                .build())));

        TrainingLessonAdminResponse ok =
                service.createLesson(
                        lesson("VIDEO")
                                .videoUrl("https://youtu.be/dQw4w9WgXcQ")
                                .resources(
                                        List.of(
                                                new ResourceRequest(20L, "  "),
                                                new ResourceRequest(23L, "Sơ đồ khu vực")))
                                .build());
        assertEquals(2, ok.resources().size());
        assertEquals("Checklist bay.pdf", ok.resources().get(0).title());
        assertEquals(23L, ok.resources().get(1).assetId());
        assertEquals("Sơ đồ khu vực", ok.resources().get(1).title());
    }

    @Test
    void pdfAssetsAreAllowedUpToFiftyMegabytes() {
        when(storage.createSignedUploadUrl(
                        anyString(), eq("application/pdf"), eq(50_000_000L), any(Duration.class)))
                .thenReturn("https://signed-put");
        assertEquals(
                "https://signed-put",
                service.createAsset(
                                new CreateTrainingAssetRequest(
                                        "huong-dan.pdf", "application/pdf", 50_000_000L),
                                "admin")
                        .uploadUrl());
        assertEquals(
                "TRAINING_ASSET_SIZE_INVALID",
                errorCode(
                        () ->
                                service.createAsset(
                                        new CreateTrainingAssetRequest(
                                                "huong-dan.pdf", "application/pdf", 50_000_001L),
                                        "admin")));
    }

    private static final String DOC_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";

    @Test
    void documentLessonTakesExactlyOneSourceFileOrGoogleLink() {
        asset(20, "application/pdf", TrainingAssetStatus.READY);
        assertEquals(
                "TRAINING_LESSON_DOCUMENT_REQUIRED",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("DOCUMENT")
                                                .documentAssetId(20L)
                                                .documentUrl(
                                                        "https://docs.google.com/document/d/"
                                                                + DOC_ID
                                                                + "/edit")
                                                .build())));
        assertEquals(
                "TRAINING_LESSON_DOCUMENT_REQUIRED",
                errorCode(
                        () -> service.createLesson(lesson("DOCUMENT").documentUrl("  ").build())));
        assertEquals(
                "TRAINING_LESSON_DOCUMENT_URL_INVALID",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("DOCUMENT")
                                                .documentUrl("https://dropbox.com/s/abc/guide.pdf")
                                                .build())));
        assertEquals(
                "TRAINING_LESSON_DOCUMENT_URL_INVALID",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("DOCUMENT")
                                                .documentUrl(
                                                        "http://docs.google.com/document/d/"
                                                                + DOC_ID)
                                                .build())));

        String link = "https://drive.google.com/file/d/" + DOC_ID + "/view?usp=sharing";
        TrainingLessonAdminResponse ok =
                service.createLesson(lesson("DOCUMENT").documentUrl(" " + link + " ").build());
        assertEquals(link, ok.documentUrl());
        assertNull(ok.documentAssetId());

        // Switching from a link to an uploaded PDF (or to another type) drops the link.
        TrainingLesson existing = new TrainingLesson();
        existing.setId(31L);
        existing.setDocument(course);
        existing.setType(TrainingLessonType.DOCUMENT);
        existing.setDocumentUrl(link);
        when(lessons.findById(31L)).thenReturn(Optional.of(existing));
        TrainingLessonAdminResponse pdf =
                service.updateLesson(31L, lesson("DOCUMENT").documentAssetId(20L).build());
        assertNull(pdf.documentUrl());
        assertEquals(20L, pdf.documentAssetId());
        existing.setDocumentUrl(link);
        assertNull(
                service.updateLesson(
                                31L, lesson("ARTICLE").bodyMarkdown("x").documentUrl(link).build())
                        .documentUrl());
    }

    @Test
    void officeFilesAreAcceptedUpToFiftyMegabytesButOnlyAsResources() {
        for (String type : TrainingAssetPolicy.OFFICE_TYPES) {
            when(storage.createSignedUploadUrl(
                            anyString(), eq(type), eq(50_000_000L), any(Duration.class)))
                    .thenReturn("https://signed-put");
            assertEquals(
                    "https://signed-put",
                    service.createAsset(
                                    new CreateTrainingAssetRequest("a", type, 50_000_000L), "admin")
                            .uploadUrl());
            assertEquals(
                    "TRAINING_ASSET_SIZE_INVALID",
                    errorCode(
                            () ->
                                    service.createAsset(
                                            new CreateTrainingAssetRequest("a", type, 50_000_001L),
                                            "admin")));
        }

        TrainingAsset docx = asset(40, TrainingAssetPolicy.DOCX, TrainingAssetStatus.READY);
        docx.setFileName("Quy trình.docx");
        asset(41, TrainingAssetPolicy.PPTX, TrainingAssetStatus.READY);
        asset(42, TrainingAssetPolicy.XLSX, TrainingAssetStatus.READY);
        TrainingLessonAdminResponse ok =
                service.createLesson(
                        lesson("ARTICLE")
                                .bodyMarkdown("x")
                                .resources(
                                        List.of(
                                                new ResourceRequest(40L, null),
                                                new ResourceRequest(41L, "Slide"),
                                                new ResourceRequest(42L, "Bảng tính")))
                                .build());
        assertEquals(3, ok.resources().size());
        assertEquals("Quy trình.docx", ok.resources().get(0).title());

        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("DOCUMENT").documentAssetId(40L).build())));
        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(() -> service.createLesson(lesson("VIDEO").videoAssetId(41L).build())));
        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(
                        () ->
                                service.createLesson(
                                        lesson("SLIDES")
                                                .slides(List.of(new SlideRequest(42L, null)))
                                                .build())));
        assertEquals(
                "TRAINING_ASSET_TYPE_MISMATCH",
                errorCode(
                        () ->
                                service.setCover(
                                        1L,
                                        new com.uav.platform.modules.training.dto.request
                                                .UpdateCourseCoverRequest(40L))));
    }

    @Test
    void confirmChecksOfficeFilesAreZipArchives() {
        TrainingAsset a = asset(5, TrainingAssetPolicy.XLSX, TrainingAssetStatus.PENDING);
        when(storage.objectExists(a.getObjectKey())).thenReturn(true);
        when(storage.metadata(a.getObjectKey()))
                .thenReturn(new ObjectMetadata(1000L, TrainingAssetPolicy.XLSX));
        when(storage.readHeader(a.getObjectKey())).thenReturn("%PDF-1.7".getBytes());
        assertEquals("TRAINING_ASSET_MISMATCH", errorCode(() -> service.confirmAsset(5L)));
        assertEquals(TrainingAssetStatus.PENDING, a.getStatus());

        when(storage.readHeader(a.getObjectKey())).thenReturn(new byte[] {'P', 'K', 3, 4, 20, 0});
        assertEquals("READY", service.confirmAsset(5L).status());
    }

    @Test
    void changingTheActiveLessonSetRecomputesLearnersCourseStatus() {
        // Adding an active lesson.
        TrainingLessonAdminResponse created =
                service.createLesson(lesson("ARTICLE").bodyMarkdown("x").build());
        assertTrue(created.active());
        verify(records, times(1)).recompute(Set.of(course));

        // A draft does not change what learners see.
        service.createLesson(lesson("ARTICLE").bodyMarkdown("x").active(false).build());
        verify(records, times(1)).recompute(any());

        TrainingLesson existing = new TrainingLesson();
        existing.setId(50L);
        existing.setDocument(course);
        existing.setType(TrainingLessonType.ARTICLE);
        existing.setBodyMarkdown("x");
        existing.setActive(true);
        when(lessons.findById(50L)).thenReturn(Optional.of(existing));

        // Editing content only: no recompute.
        service.updateLesson(50L, lesson("ARTICLE").bodyMarkdown("y").build());
        verify(records, times(1)).recompute(any());

        // Hiding through PUT, then showing again.
        service.updateLesson(50L, lesson("ARTICLE").bodyMarkdown("y").active(false).build());
        verify(records, times(2)).recompute(Set.of(course));
        service.updateLesson(50L, lesson("ARTICLE").bodyMarkdown("y").active(true).build());
        verify(records, times(3)).recompute(Set.of(course));

        // Moving to another course affects both.
        TrainingDocument other = new TrainingDocument();
        other.setId(2L);
        when(documents.findById(2L)).thenReturn(Optional.of(other));
        service.updateLesson(
                50L,
                UpsertTrainingLessonRequest.builder()
                        .courseId(2L)
                        .title("Bài 1")
                        .type("ARTICLE")
                        .bodyMarkdown("y")
                        .build());
        verify(records).recompute(Set.of(course, other));

        // Deleting (soft) an active lesson; deleting it again changes nothing.
        service.deleteLesson(50L);
        service.deleteLesson(50L);
        verify(records, times(1)).recompute(Set.of(other));
    }

    @Test
    void lessonMediaCollectionsAreBatchFetched() throws Exception {
        for (String field : List.of("slides", "resources")) {
            BatchSize batch =
                    TrainingLesson.class.getDeclaredField(field).getAnnotation(BatchSize.class);
            assertNotNull(batch, field);
            assertTrue(batch.size() >= 20, field);
        }
    }
}
