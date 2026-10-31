package com.uav.platform.service.training;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.training.UpdateTrainingProgressRequest;
import com.uav.platform.dto.response.training.TrainingDocumentResponse;
import com.uav.platform.dto.response.training.TrainingOverviewResponse;
import com.uav.platform.entity.training.TrainingDocument;
import com.uav.platform.entity.training.TrainingLesson;
import com.uav.platform.entity.training.TrainingLessonProgress;
import com.uav.platform.entity.training.UserTrainingProgress;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.training.TrainingDocumentRepository;
import com.uav.platform.repository.training.TrainingLessonProgressRepository;
import com.uav.platform.repository.training.TrainingLessonRepository;
import com.uav.platform.repository.training.UserTrainingProgressRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.training.TrainingServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@DisplayName("TrainingService Unit Tests")
class TrainingServiceTest {

    private TrainingDocumentRepository trainingDocumentRepository;
    private UserTrainingProgressRepository userTrainingProgressRepository;
    private UserRepository userRepository;
    private TrainingLessonRepository lessonRepository;
    private TrainingLessonProgressRepository lessonProgressRepository;
    private TrainingServiceImpl trainingService;

    @BeforeEach
    void setUp() {
        trainingDocumentRepository = mock(TrainingDocumentRepository.class);
        userTrainingProgressRepository = mock(UserTrainingProgressRepository.class);
        userRepository = mock(UserRepository.class);
        lessonRepository = mock(TrainingLessonRepository.class);
        lessonProgressRepository = mock(TrainingLessonProgressRepository.class);
        trainingService =
                new TrainingServiceImpl(
                        trainingDocumentRepository,
                        userTrainingProgressRepository,
                        userRepository,
                        lessonRepository,
                        lessonProgressRepository);
    }

    @Test
    @DisplayName("getOverview should compute KPI metrics and filter documents by category/search")
    void getOverview_ComputesKpiAndFilters() {
        TrainingDocument doc1 = new TrainingDocument();
        doc1.setId(1L);
        doc1.setCode("TRN-CUST-01");
        doc1.setSlug("trn-cust-01");
        doc1.setTargetPortal("CUSTOMER");
        doc1.setCategory("SITE_PREP");
        doc1.setLevel("MANDATORY");
        doc1.setEstimatedMinutes(15);
        doc1.setIsMandatory(true);
        doc1.setActive(true);
        doc1.setTitle("Khảo sát hiện trường");
        doc1.setSummary("Chuẩn bị tọa độ KML");
        doc1.setContentMarkdown("### 1. Nội dung");
        doc1.setChecklistJson("[\"Bước 1\",\"Bước 2\"]");

        TrainingDocument doc2 = new TrainingDocument();
        doc2.setId(2L);
        doc2.setCode("TRN-CUST-02");
        doc2.setSlug("trn-cust-02");
        doc2.setTargetPortal("CUSTOMER");
        doc2.setCategory("SENSOR_GSD");
        doc2.setLevel("STANDARD_SOP");
        doc2.setEstimatedMinutes(20);
        doc2.setIsMandatory(false);
        doc2.setActive(true);
        doc2.setTitle("Lựa chọn cảm biến");
        doc2.setSummary("Độ phân giải GSD");
        doc2.setContentMarkdown("### 1. Cảm biến");
        doc2.setChecklistJson("[\"Bước A\"]");

        AppUser user = new AppUser();
        user.setId(99L);
        user.setUsername("customer01");

        UserTrainingProgress progress1 = new UserTrainingProgress();
        progress1.setUser(user);
        progress1.setDocument(doc1);
        progress1.setStatus("COMPLETED");
        progress1.setCheckedStepsJson("[0,1]");

        when(userRepository.findByUsername("customer01")).thenReturn(Optional.of(user));
        when(trainingDocumentRepository.findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(
                        "CUSTOMER"))
                .thenReturn(List.of(doc1, doc2));
        when(userTrainingProgressRepository.findByUserId(99L)).thenReturn(List.of(progress1));

        var auth = new UsernamePasswordAuthenticationToken("customer01", "pass", List.of());
        TrainingOverviewResponse overview =
                trainingService.getOverview("CUSTOMER", "SITE_PREP", null, auth);

        assertEquals("CUSTOMER", overview.getPortal());
        assertEquals(2, overview.getTotalDocuments());
        assertEquals(1, overview.getCompletedDocuments());
        assertEquals(1, overview.getMandatoryDocuments());
        assertEquals(1, overview.getMandatoryCompleted());
        assertEquals(35, overview.getTotalEstimatedMinutes());
        assertEquals(15, overview.getCompletedMinutes());
        assertEquals(1, overview.getDocuments().size());
        assertEquals("TRN-CUST-01", overview.getDocuments().get(0).getCode());
        assertEquals("COMPLETED", overview.getDocuments().get(0).getProgressStatus());
    }

    @Test
    @DisplayName(
            "updateProgress should mark document COMPLETED when all checklist steps are checked")
    void updateProgress_MarksCompletedWhenAllStepsChecked() {
        TrainingDocument doc = new TrainingDocument();
        doc.setId(5L);
        doc.setCode("TRN-OPS-01");
        doc.setSlug("trn-ops-01");
        doc.setTargetPortal("OPERATIONS");
        doc.setCategory("FLIGHT_SOP");
        doc.setLevel("MANDATORY");
        doc.setEstimatedMinutes(25);
        doc.setIsMandatory(true);
        doc.setActive(true);
        doc.setTitle("Pre-flight 12 điểm");
        doc.setSummary("Kiểm tra trước bay");
        doc.setContentMarkdown("### SOP");
        doc.setChecklistJson("[\"Kiểm tra cánh\",\"Kiểm tra pin\"]");

        AppUser user = new AppUser();
        user.setId(42L);
        user.setUsername("ops01");
        user.setRole(UserRole.ROLE_OPERATOR);

        when(userRepository.findByUsername("ops01")).thenReturn(Optional.of(user));
        when(trainingDocumentRepository.findById(5L)).thenReturn(Optional.of(doc));
        when(userTrainingProgressRepository.findByUserIdAndDocumentId(42L, 5L))
                .thenReturn(Optional.empty());
        when(userTrainingProgressRepository.save(any(UserTrainingProgress.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        var auth = new UsernamePasswordAuthenticationToken("ops01", "pass", List.of());
        var req = UpdateTrainingProgressRequest.builder().checkedSteps(List.of(0, 1)).build();
        TrainingDocumentResponse response = trainingService.updateProgress(5L, req, auth);

        assertEquals("COMPLETED", response.getProgressStatus());
        assertEquals(List.of(0, 1), response.getCheckedSteps());
        assertNotNull(response.getCompletedAt());
    }

    private UsernamePasswordAuthenticationToken signedIn(String username, UserRole role) {
        AppUser user = new AppUser();
        user.setId(7L);
        user.setUsername(username);
        user.setRole(role);
        when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        return new UsernamePasswordAuthenticationToken(username, "", List.of());
    }

    private TrainingDocument doc(long id, String portal, boolean active, String checklistJson) {
        TrainingDocument d = new TrainingDocument();
        d.setId(id);
        d.setCode("TRN-" + id);
        d.setSlug("trn-" + id);
        d.setTargetPortal(portal);
        d.setActive(active);
        d.setTitle("Doc " + id);
        d.setChecklistJson(checklistJson);
        return d;
    }

    @Test
    @DisplayName("customers cannot list or open operations/admin documents, nor hidden ones")
    void customerIsKeptToCustomerDocuments() {
        var customer = signedIn("pilot01", UserRole.ROLE_PILOT);
        when(trainingDocumentRepository.findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(
                        "CUSTOMER"))
                .thenReturn(List.of());
        assertEquals(
                "CUSTOMER", trainingService.getOverview("ADMIN", null, null, customer).portal());
        verify(trainingDocumentRepository, never())
                .findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc("ADMIN");

        when(trainingDocumentRepository.findByCodeIgnoreCaseOrSlugIgnoreCase("TRN-1", "TRN-1"))
                .thenReturn(Optional.of(doc(1, "ADMIN", true, "[]")));
        assertThrows(
                SystemException.class, () -> trainingService.getByCodeOrSlug("TRN-1", customer));
        when(trainingDocumentRepository.findByCodeIgnoreCaseOrSlugIgnoreCase("TRN-2", "TRN-2"))
                .thenReturn(Optional.of(doc(2, "CUSTOMER", false, "[]")));
        assertThrows(
                SystemException.class, () -> trainingService.getByCodeOrSlug("TRN-2", customer));
        when(trainingDocumentRepository.findById(3L))
                .thenReturn(Optional.of(doc(3, "OPERATIONS", true, "[]")));
        assertThrows(
                SystemException.class,
                () ->
                        trainingService.updateProgress(
                                3L, new UpdateTrainingProgressRequest(List.of(), false), customer));
    }

    @Test
    @DisplayName("operators may read operations documents; admins may open inactive drafts")
    void staffSeeTheirPortals() {
        var operator = signedIn("op01", UserRole.ROLE_OPERATOR);
        when(trainingDocumentRepository.findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(
                        "OPERATIONS"))
                .thenReturn(List.of());
        assertEquals(
                "OPERATIONS", trainingService.getOverview("ADMIN", null, null, operator).portal());
        var admin = signedIn("boss", UserRole.ROLE_ADMIN);
        when(trainingDocumentRepository.findByCodeIgnoreCaseOrSlugIgnoreCase("TRN-4", "TRN-4"))
                .thenReturn(Optional.of(doc(4, "ADMIN", false, "[]")));
        assertEquals("ADMIN", trainingService.getByCodeOrSlug("TRN-4", admin).targetPortal());
    }

    @Test
    @DisplayName("steps beyond the checklist and markCompleted cannot complete a document")
    void checklistCannotBeSkipped() {
        var customer = signedIn("pilot02", UserRole.ROLE_PILOT);
        when(trainingDocumentRepository.findById(5L))
                .thenReturn(Optional.of(doc(5, "CUSTOMER", true, "[\"a\",\"b\"]")));
        when(userTrainingProgressRepository.findByUserIdAndDocumentId(7L, 5L))
                .thenReturn(Optional.empty());
        when(userTrainingProgressRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        UpdateTrainingProgressRequest fake =
                new UpdateTrainingProgressRequest(List.of(10, 11, 12), true);
        assertEquals(
                "NOT_STARTED", trainingService.updateProgress(5L, fake, customer).progressStatus());
        UpdateTrainingProgressRequest real =
                new UpdateTrainingProgressRequest(List.of(0, 1), false);
        assertEquals(
                "COMPLETED", trainingService.updateProgress(5L, real, customer).progressStatus());
    }

    @Test
    @DisplayName(
            "a course with lessons is not COMPLETED by ticking the checklist while lessons are unfinished")
    void checklistAloneDoesNotCompleteACourseWithLessons() {
        var customer = signedIn("pilot03", UserRole.ROLE_PILOT);
        TrainingDocument course = doc(6, "CUSTOMER", true, "[\"a\",\"b\"]");
        when(trainingDocumentRepository.findById(6L)).thenReturn(Optional.of(course));
        TrainingLesson first = new TrainingLesson();
        first.setId(60L);
        TrainingLesson second = new TrainingLesson();
        second.setId(61L);
        when(lessonRepository.findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(6L))
                .thenReturn(List.of(first, second));
        TrainingLessonProgress firstDone = new TrainingLessonProgress();
        firstDone.setLesson(first);
        firstDone.setCompletedAt(OffsetDateTime.now());
        when(lessonProgressRepository.findByUserIdAndLessonIdIn(7L, List.of(60L, 61L)))
                .thenReturn(List.of(firstDone));
        UserTrainingProgress[] stored = {null};
        when(userTrainingProgressRepository.findByUserIdAndDocumentId(7L, 6L))
                .thenAnswer(i -> Optional.ofNullable(stored[0]));
        when(userTrainingProgressRepository.save(any()))
                .thenAnswer(
                        i -> {
                            stored[0] = i.getArgument(0);
                            return stored[0];
                        });

        UpdateTrainingProgressRequest allSteps =
                new UpdateTrainingProgressRequest(List.of(0, 1), true);
        TrainingDocumentResponse partial = trainingService.updateProgress(6L, allSteps, customer);
        assertEquals("IN_PROGRESS", partial.progressStatus());
        assertNull(partial.completedAt());
        verify(userTrainingProgressRepository).insertIfAbsent(7L, 6L);

        // Once every active lesson is done, the same checklist completes the course.
        TrainingLessonProgress secondDone = new TrainingLessonProgress();
        secondDone.setLesson(second);
        secondDone.setCompletedAt(OffsetDateTime.now());
        when(lessonProgressRepository.findByUserIdAndLessonIdIn(7L, List.of(60L, 61L)))
                .thenReturn(List.of(firstDone, secondDone));
        TrainingDocumentResponse complete = trainingService.updateProgress(6L, allSteps, customer);
        assertEquals("COMPLETED", complete.progressStatus());
        assertNotNull(complete.completedAt());

        // Unticking a step afterwards keeps the completion and its date.
        TrainingDocumentResponse unticked =
                trainingService.updateProgress(
                        6L, new UpdateTrainingProgressRequest(List.of(0), false), customer);
        assertEquals("COMPLETED", unticked.progressStatus());
        assertEquals(complete.completedAt(), unticked.completedAt());
    }
}
