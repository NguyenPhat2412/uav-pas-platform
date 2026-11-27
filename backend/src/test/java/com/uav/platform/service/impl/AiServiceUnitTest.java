package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IAiDetectionDao;
import com.uav.platform.dao.IAiTaskDao;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.ISarMissionDao;
import com.uav.platform.dto.request.AiDetectionResultRequest;
import com.uav.platform.dto.request.AiTaskDispatchRequest;
import com.uav.platform.dto.request.AiTaskResultRequest;
import com.uav.platform.dto.request.VerifyDetectionRequest;
import com.uav.platform.entity.AiDetection;
import com.uav.platform.entity.AiTask;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.SarMission;
import com.uav.platform.enums.AiTaskStatus;
import com.uav.platform.enums.AiTaskType;
import com.uav.platform.enums.ProcessingNode;
import com.uav.platform.enums.SarStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.NotificationService;
import com.uav.platform.service.PermissionService;
import com.uav.platform.service.WebhookService;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

class AiServiceUnitTest {

    @Test
    void dispatchListSubmitAndVerifyCoverAccessSuccessAndErrorBranches() {
        IAiTaskDao taskDao = mock(IAiTaskDao.class);
        IAiDetectionDao detDao = mock(IAiDetectionDao.class);
        IMissionDao missionDao = mock(IMissionDao.class);
        IMediaAssetDao mediaDao = mock(IMediaAssetDao.class);
        ISarMissionDao sarDao = mock(ISarMissionDao.class);
        NotificationService notifications = mock(NotificationService.class);
        WebhookService webhooks = mock(WebhookService.class);
        PermissionService permissions = mock(PermissionService.class);

        AiServiceImpl service =
                new AiServiceImpl(
                        taskDao,
                        detDao,
                        missionDao,
                        mediaDao,
                        sarDao,
                        notifications,
                        webhooks,
                        permissions);

        AppUser customer = new AppUser();
        customer.setId(10L);
        customer.setUsername("cust");
        AppUser operator = new AppUser();
        operator.setId(20L);
        operator.setUsername("pilot");
        Mission mission = new Mission();
        mission.setId(5L);
        mission.setCode("MSN-5");
        mission.setCustomer(customer);
        mission.setOperator(operator);

        Authentication stranger = new UsernamePasswordAuthenticationToken("stranger", "N/A");
        Authentication customerAuth = new UsernamePasswordAuthenticationToken("cust", "N/A");
        Authentication operatorAuth = new UsernamePasswordAuthenticationToken("pilot", "N/A");

        when(missionDao.findById(5L)).thenReturn(Optional.of(mission));
        when(missionDao.findById(999L)).thenReturn(Optional.empty());

        // Missing mission -> 404
        assertThrows(
                SystemException.class,
                () ->
                        service.dispatchTask(
                                new AiTaskDispatchRequest(
                                        999L,
                                        null,
                                        AiTaskType.PERSON_SEARCH,
                                        ProcessingNode.KV260_EDGE,
                                        0.5),
                                operatorAuth));

        // Stranger denied
        assertThrows(
                AccessDeniedException.class,
                () ->
                        service.dispatchTask(
                                new AiTaskDispatchRequest(
                                        5L,
                                        null,
                                        AiTaskType.PERSON_SEARCH,
                                        ProcessingNode.KV260_EDGE,
                                        0.5),
                                stranger));

        // Unowned media denied for customer
        MediaAsset foreignMedia = new MediaAsset();
        foreignMedia.setLinkedEntityType("MISSION");
        foreignMedia.setLinkedEntityId("999");
        foreignMedia.setUploadedBy("other");
        when(mediaDao.findById(77L)).thenReturn(Optional.of(foreignMedia));
        assertThrows(
                AccessDeniedException.class,
                () ->
                        service.dispatchTask(
                                new AiTaskDispatchRequest(
                                        5L,
                                        77L,
                                        AiTaskType.PERSON_SEARCH,
                                        ProcessingNode.KV260_EDGE,
                                        0.5),
                                customerAuth));

        // Linked media succeeds
        MediaAsset ownMedia = new MediaAsset();
        ownMedia.setLinkedEntityType("MISSION");
        ownMedia.setLinkedEntityId("5");
        when(mediaDao.findById(88L)).thenReturn(Optional.of(ownMedia));
        when(taskDao.save(any(AiTask.class))).thenAnswer(inv -> inv.getArgument(0));
        assertNotNull(
                service.dispatchTask(
                        new AiTaskDispatchRequest(
                                5L, 88L, AiTaskType.PERSON_SEARCH, ProcessingNode.KV260_EDGE, 0.7),
                        operatorAuth));

        // listTasks & listDetections
        when(taskDao.findByMissionIdOrderByCreatedAtDesc(5L)).thenReturn(List.of());
        when(detDao.findByMissionIdOrderByCreatedAtDesc(5L)).thenReturn(List.of());
        assertTrue(service.listTasks(5L, operatorAuth).isEmpty());
        assertTrue(service.listDetections(5L, customerAuth).isEmpty());
        assertThrows(SystemException.class, () -> service.listTasks(999L, operatorAuth));
        assertThrows(SystemException.class, () -> service.listDetections(999L, operatorAuth));

        // submitResults: completed with detections + notification
        AiTask pendingTask = new AiTask();
        pendingTask.setId(30L);
        pendingTask.setMission(mission);
        pendingTask.setProcessingNode(ProcessingNode.KV260_EDGE);
        pendingTask.setStatus(AiTaskStatus.PROCESSING);
        when(taskDao.findByIdForUpdate(30L)).thenReturn(Optional.of(pendingTask));
        when(detDao.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        var detItem =
                new AiDetectionResultRequest(
                        "PERSON", 0.92, 0.1, 0.2, 0.3, 0.4, 21.0, 105.8, "trk-1");
        service.submitResults(
                30L,
                new AiTaskResultRequest("COMPLETED", 45, 30.0, 65.0, 52.0, null, List.of(detItem)),
                operatorAuth);
        verify(notifications).sendNotification(any());

        // Retrying already finished task -> 409 conflict
        assertThrows(
                SystemException.class,
                () ->
                        service.submitResults(
                                30L,
                                new AiTaskResultRequest("FAILED", 1, 0.0, 0.0, 0.0, "err", null),
                                operatorAuth));

        // verifyDetection: customer forbidden, operator succeeds & updates SAR + webhook
        AiDetection detection =
                new AiDetection(
                        pendingTask,
                        mission,
                        "PERSON",
                        0.95,
                        0.1,
                        0.2,
                        0.3,
                        0.4,
                        21.0,
                        105.8,
                        "trk-1");
        detection.setId(50L);
        when(detDao.findById(50L)).thenReturn(Optional.of(detection));
        when(detDao.save(any(AiDetection.class))).thenAnswer(inv -> inv.getArgument(0));
        SarMission sar = new SarMission();
        when(sarDao.findByMissionId(5L)).thenReturn(Optional.of(sar));

        assertThrows(
                AccessDeniedException.class,
                () -> service.verifyDetection(50L, new VerifyDetectionRequest(true), customerAuth));

        service.verifyDetection(50L, new VerifyDetectionRequest(true), operatorAuth);
        assertEquals(SarStatus.TARGET_LOCATED, sar.getSarStatus());
        verify(webhooks).broadcastEvent(eq("SAR_EMERGENCY_TRIGGERED"), any());
    }
}
