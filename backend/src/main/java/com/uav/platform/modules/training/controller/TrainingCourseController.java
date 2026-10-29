package com.uav.platform.modules.training.controller;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.training.dto.request.CreateTrainingAssetRequest;
import com.uav.platform.modules.training.dto.request.UpdateCourseCoverRequest;
import com.uav.platform.modules.training.dto.request.UpdateLessonProgressRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingLessonRequest;
import com.uav.platform.modules.training.dto.response.TrainingAssetResponse;
import com.uav.platform.modules.training.dto.response.TrainingAssetUploadResponse;
import com.uav.platform.modules.training.dto.response.TrainingCourseDetailResponse;
import com.uav.platform.modules.training.dto.response.TrainingCourseSummaryResponse;
import com.uav.platform.modules.training.dto.response.TrainingLessonAdminResponse;
import com.uav.platform.modules.training.dto.response.TrainingLessonDetailResponse;
import com.uav.platform.modules.training.service.TrainingCourseAdminService;
import com.uav.platform.modules.training.service.TrainingCourseService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Udemy-style training courses: lessons, learner progress and admin authoring (docs/training-courses-api.md). */
@RestController
@RequestMapping(ApiRoutes.Training.BASE)
@RequiredArgsConstructor
@Tag(
        name = "Training Courses",
        description = "Course lessons (video, slides, article) and progress")
public class TrainingCourseController {

    private static final String MANAGE =
            "@permissionService.has(authentication, 'PERMISSION_MANAGE') or hasAnyRole('SUPER_ADMIN','SYSTEM_ADMIN')";

    private final TrainingCourseService courses;
    private final TrainingCourseAdminService admin;

    @Operation(summary = "List training courses of a portal with the caller's progress")
    @GetMapping(ApiRoutes.Training.COURSES)
    public ResponseEntity<List<TrainingCourseSummaryResponse>> listCourses(
            @RequestParam(required = false, defaultValue = "CUSTOMER") String portal,
            Authentication authentication) {
        return ResponseEntity.ok(courses.listCourses(portal, authentication));
    }

    @Operation(summary = "Course page: overview, checklist and lesson outline by section")
    @GetMapping(ApiRoutes.Training.COURSE_BY_CODE)
    public ResponseEntity<TrainingCourseDetailResponse> getCourse(
            @PathVariable String codeOrSlug, Authentication authentication) {
        return ResponseEntity.ok(courses.getCourse(codeOrSlug, authentication));
    }

    @Operation(summary = "Lesson player content with signed media URLs")
    @GetMapping(ApiRoutes.Training.LESSON_BY_ID)
    public ResponseEntity<TrainingLessonDetailResponse> getLesson(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(courses.getLesson(id, authentication));
    }

    @Operation(summary = "Save the caller's lesson completion and video position")
    @PutMapping(ApiRoutes.Training.LESSON_PROGRESS)
    public ResponseEntity<TrainingLessonDetailResponse> updateLessonProgress(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) UpdateLessonProgressRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(courses.updateLessonProgress(id, request, authentication));
    }

    @Operation(summary = "All lessons of a course with editable fields (Admin)")
    @PreAuthorize(MANAGE)
    @GetMapping(ApiRoutes.Training.ADMIN_COURSE_LESSONS)
    public ResponseEntity<List<TrainingLessonAdminResponse>> listLessons(@PathVariable Long id) {
        return ResponseEntity.ok(admin.listLessons(id));
    }

    @Operation(summary = "Create a lesson (Admin)")
    @PreAuthorize(MANAGE)
    @PostMapping(ApiRoutes.Training.ADMIN_LESSONS)
    public ResponseEntity<TrainingLessonAdminResponse> createLesson(
            @Valid @RequestBody UpsertTrainingLessonRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(admin.createLesson(request));
    }

    @Operation(summary = "Update a lesson (Admin)")
    @PreAuthorize(MANAGE)
    @PutMapping(ApiRoutes.Training.ADMIN_LESSON_BY_ID)
    public ResponseEntity<TrainingLessonAdminResponse> updateLesson(
            @PathVariable Long id, @Valid @RequestBody UpsertTrainingLessonRequest request) {
        return ResponseEntity.ok(admin.updateLesson(id, request));
    }

    @Operation(summary = "Hide a lesson (soft delete, Admin)")
    @PreAuthorize(MANAGE)
    @DeleteMapping(ApiRoutes.Training.ADMIN_LESSON_BY_ID)
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        admin.deleteLesson(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Set or clear the course cover image (Admin)")
    @PreAuthorize(MANAGE)
    @PutMapping(ApiRoutes.Training.ADMIN_COURSE_COVER)
    public ResponseEntity<TrainingCourseSummaryResponse> setCover(
            @PathVariable Long id,
            @RequestBody(required = false) UpdateCourseCoverRequest request,
            Authentication authentication) {
        admin.setCover(id, request);
        return ResponseEntity.ok(courses.getCourseSummary(id, authentication));
    }

    @Operation(summary = "Register a training upload and get a signed PUT URL (Admin)")
    @PreAuthorize(MANAGE)
    @PostMapping(ApiRoutes.Training.ADMIN_ASSETS)
    public ResponseEntity<TrainingAssetUploadResponse> createAsset(
            @Valid @RequestBody CreateTrainingAssetRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        admin.createAsset(
                                request, authentication == null ? null : authentication.getName()));
    }

    @Operation(summary = "Confirm an upload: the stored object must match type and size (Admin)")
    @PreAuthorize(MANAGE)
    @PostMapping(ApiRoutes.Training.ADMIN_ASSET_CONFIRM)
    public ResponseEntity<TrainingAssetResponse> confirmAsset(@PathVariable Long id) {
        return ResponseEntity.ok(admin.confirmAsset(id));
    }
}
