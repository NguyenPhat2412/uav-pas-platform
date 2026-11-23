package com.uav.platform.service.impl.training.catalog;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.training.ITrainingAssetDao;
import com.uav.platform.dao.training.ITrainingDocumentDao;
import com.uav.platform.dao.training.ITrainingLessonDao;
import com.uav.platform.dao.training.ITrainingLessonProgressDao;
import com.uav.platform.dao.training.IUserTrainingProgressDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.training.catalog.UpdateTrainingProgressRequest;
import com.uav.platform.dto.request.training.catalog.UpsertTrainingDocumentRequest;
import com.uav.platform.entity.training.TrainingAsset;
import com.uav.platform.entity.training.TrainingDocument;
import com.uav.platform.entity.training.TrainingLesson;
import com.uav.platform.entity.training.TrainingLessonProgress;
import com.uav.platform.entity.training.UserTrainingProgress;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.training.course.TrainingMediaUrls;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

class TrainingServiceUnitTest {

    @Test
    void overviewCreateUpdateAndProgressCoverAdminOperatorAndCustomerBranches() {
        ITrainingDocumentDao docDao = mock(ITrainingDocumentDao.class);
        IUserTrainingProgressDao progDao = mock(IUserTrainingProgressDao.class);
        IUserDao userDao = mock(IUserDao.class);
        ITrainingLessonDao lessonDao = mock(ITrainingLessonDao.class);
        ITrainingLessonProgressDao lessonProgDao = mock(ITrainingLessonProgressDao.class);
        PermissionService permissions = mock(PermissionService.class);
        ITrainingAssetDao assetDao = mock(ITrainingAssetDao.class);
        TrainingMediaUrls mediaUrls = mock(TrainingMediaUrls.class);

        TrainingServiceImpl service =
                new TrainingServiceImpl(
                        docDao,
                        progDao,
                        userDao,
                        lessonDao,
                        lessonProgDao,
                        permissions,
                        assetDao,
                        mediaUrls);

        AppUser admin = new AppUser();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setRole(UserRole.ROLE_ADMIN);
        Authentication adminAuth =
                new UsernamePasswordAuthenticationToken("admin", "N/A", List.of());
        when(userDao.findByUsername("admin")).thenReturn(Optional.of(admin));

        TrainingDocument doc = new TrainingDocument();
        doc.setId(10L);
        doc.setCode("SOP-01");
        doc.setSlug("sop-01-safety");
        doc.setTargetPortal("OPERATIONS");
        doc.setCategory("SAFETY");
        doc.setLevel("BASIC");
        doc.setVersionTag("SOP-2026.1");
        doc.setEstimatedMinutes(15);
        doc.setIsMandatory(true);
        doc.setActive(true);
        doc.setTitle("Pre-flight Safety");
        doc.setSummary("Check props and battery");
        doc.setContentMarkdown("# Safety");
        doc.setChecklistJson("[\"Step 1\",\"Step 2\"]");
        doc.setCoverAssetId(55L);

        TrainingAsset cover = new TrainingAsset();
        cover.setId(55L);
        when(assetDao.findAllById(any())).thenReturn(List.of(cover));
        when(assetDao.findById(55L)).thenReturn(Optional.of(cover));
        when(mediaUrls.signedGet(cover)).thenReturn("https://cdn.uav.vn/cover.jpg");

        UserTrainingProgress doneProg = new UserTrainingProgress();
        doneProg.setDocument(doc);
        doneProg.setStatus("COMPLETED");
        doneProg.setCheckedStepsJson("[0,1]");

        when(docDao.findByTargetPortalOrderBySortOrderAscIdAsc("OPERATIONS"))
                .thenReturn(List.of(doc));
        when(progDao.findByUserId(1L)).thenReturn(List.of(doneProg));

        var overview = service.getOverview("OPERATIONS", "SAFETY", "safety", adminAuth);
        assertEquals(1, overview.getTotalDocuments());
        assertEquals(1, overview.getCompletedDocuments());
        assertEquals(1, overview.getMandatoryCompleted());
        assertEquals("https://cdn.uav.vn/cover.jpg", overview.getDocuments().get(0).getCoverUrl());

        // getByCodeOrSlug
        assertThrows(SystemException.class, () -> service.getByCodeOrSlug(" ", adminAuth));
        when(docDao.findByCodeIgnoreCaseOrSlugIgnoreCase("SOP-01", "SOP-01"))
                .thenReturn(Optional.of(doc));
        when(progDao.findByUserIdAndDocumentId(1L, 10L)).thenReturn(Optional.of(doneProg));
        assertEquals("SOP-01", service.getByCodeOrSlug("SOP-01", adminAuth).getCode());

        // updateProgress with active lessons & checklist
        when(docDao.findById(10L)).thenReturn(Optional.of(doc));
        TrainingLesson lesson = new TrainingLesson();
        lesson.setId(100L);
        when(lessonDao.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(10L))
                .thenReturn(List.of(lesson));
        TrainingLessonProgress lp = new TrainingLessonProgress();
        lp.setCompletedAt(java.time.OffsetDateTime.now());
        lp.setPositionSeconds(60);
        when(lessonProgDao.findByUserIdAndLessonIdIn(eq(1L), any())).thenReturn(List.of(lp));
        when(progDao.save(any(UserTrainingProgress.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateTrainingProgressRequest progReq =
                new UpdateTrainingProgressRequest(List.of(0, 1), false);
        var updatedProg = service.updateProgress(10L, progReq, adminAuth);
        assertEquals("COMPLETED", updatedProg.getProgressStatus());

        // createDocument & duplicate code conflict & slug collision
        UpsertTrainingDocumentRequest createReq =
                UpsertTrainingDocumentRequest.builder()
                        .code("SOP-02")
                        .targetPortal("CUSTOMER")
                        .category("OPERATIONS")
                        .level("INTERMEDIATE")
                        .title("Hướng dẫn điều khiển UAV")
                        .summary("Tóm tắt")
                        .contentMarkdown("Nội dung")
                        .checklistSteps(List.of("Bước 1"))
                        .estimatedMinutes(20)
                        .isMandatory(true)
                        .sortOrder(5)
                        .active(true)
                        .build();

        when(docDao.findByCodeIgnoreCase("SOP-02")).thenReturn(Optional.empty());
        when(docDao.findBySlugIgnoreCase(anyString()))
                .thenReturn(Optional.of(doc))
                .thenReturn(Optional.empty());
        when(docDao.save(any(TrainingDocument.class)))
                .thenAnswer(
                        inv -> {
                            TrainingDocument d = inv.getArgument(0);
                            if (d.getId() == null) d.setId(20L);
                            return d;
                        });
        var created = service.createDocument(createReq, adminAuth);
        assertEquals("SOP-02", created.getCode());
        assertTrue(created.getSlug().endsWith("-2"));

        // Duplicate code throws 409
        when(docDao.findByCodeIgnoreCase("SOP-01")).thenReturn(Optional.of(doc));
        UpsertTrainingDocumentRequest dupReq =
                UpsertTrainingDocumentRequest.builder()
                        .code("SOP-01")
                        .targetPortal("CUSTOMER")
                        .category("OPERATIONS")
                        .level("BASIC")
                        .title("Dup")
                        .summary("Dup")
                        .contentMarkdown("Dup")
                        .estimatedMinutes(5)
                        .build();
        assertThrows(SystemException.class, () -> service.createDocument(dupReq, adminAuth));

        // updateDocument happy path
        when(docDao.findById(20L)).thenReturn(Optional.of(doc));
        UpsertTrainingDocumentRequest updReq =
                UpsertTrainingDocumentRequest.builder()
                        .code("SOP-02")
                        .targetPortal("CUSTOMER")
                        .category("OPERATIONS")
                        .level("INTERMEDIATE")
                        .versionTag("SOP-2026.2")
                        .title("Hướng dẫn cập nhật")
                        .summary("Tóm tắt")
                        .contentMarkdown("Nội dung")
                        .checklistSteps(List.of("Bước 1"))
                        .estimatedMinutes(25)
                        .isMandatory(false)
                        .sortOrder(2)
                        .active(true)
                        .build();
        when(docDao.findBySlugIgnoreCase(anyString())).thenReturn(Optional.empty());
        var updatedDoc = service.updateDocument(20L, updReq, adminAuth);
        assertEquals("SOP-2026.2", updatedDoc.getVersionTag());

        // Portal helpers
        AppUser pilot = new AppUser();
        pilot.setRole(UserRole.ROLE_PILOT);
        assertEquals("CUSTOMER", TrainingServiceImpl.defaultPortal(pilot));
        assertEquals(java.util.Set.of("CUSTOMER"), TrainingServiceImpl.portalsFor(pilot));

        AppUser commander = new AppUser();
        commander.setRole(UserRole.ROLE_COMMANDER);
        assertEquals("OPERATIONS", TrainingServiceImpl.defaultPortal(commander));
        assertTrue(TrainingServiceImpl.portalsFor(commander).contains("OPERATIONS"));
        assertEquals("ADMIN", TrainingServiceImpl.defaultPortal(admin));
    }
}
