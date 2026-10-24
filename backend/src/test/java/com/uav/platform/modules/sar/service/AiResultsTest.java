package com.uav.platform.modules.sar.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.sar.dto.request.AiDetectionResultRequest;
import com.uav.platform.modules.sar.dto.request.AiTaskResultRequest;
import com.uav.platform.modules.sar.entity.AiDetection;
import com.uav.platform.modules.sar.entity.AiTask;
import com.uav.platform.modules.sar.enums.AiTaskStatus;
import com.uav.platform.modules.sar.mapper.SarMapper;
import com.uav.platform.modules.sar.repository.AiDetectionRepository;
import com.uav.platform.modules.sar.repository.AiTaskRepository;
import com.uav.platform.modules.sar.service.impl.AiServiceImpl;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.Optional;

class AiResultsTest {
    final AiTaskRepository tasks = mock(AiTaskRepository.class);
    final AiDetectionRepository detections = mock(AiDetectionRepository.class);
    final AiServiceImpl service =
            new AiServiceImpl(
                    tasks,
                    detections,
                    mock(MissionRepository.class),
                    mock(MediaAssetRepository.class),
                    null,
                    null,
                    null,
                    null,
                    Mappers.getMapper(SarMapper.class));

    private AiTask pending() {
        AiTask task = new AiTask();
        task.setMission(mock(Mission.class));
        task.setStatus(AiTaskStatus.PENDING);
        when(tasks.findById(7L)).thenReturn(Optional.of(task));
        when(tasks.save(any())).thenAnswer(i -> i.getArgument(0));
        return task;
    }

    @Test
    @SuppressWarnings("unchecked")
    void completedResultsStoreReportedMetricsAndDetections() {
        AiTask task = pending();
        var det =
                new AiDetectionResultRequest(
                        "person", 0.88, 10.0, 20.0, 5.0, 9.0, 20.71, 107.05, "T-1");
        service.submitResults(
                7L,
                new AiTaskResultRequest("COMPLETED", 41, 24.0, 61.0, 57.5, null, List.of(det)),
                null);
        assertEquals(AiTaskStatus.COMPLETED, task.getStatus());
        assertEquals(24.0, task.getFps());
        assertEquals(57.5, task.getSocTemperature());
        verify(detections)
                .saveAll(
                        argThat(
                                list -> {
                                    List<AiDetection> l = (List<AiDetection>) list;
                                    return l.size() == 1
                                            && "person".equals(l.get(0).getLabel())
                                            && l.get(0).getLatitude() == 20.71;
                                }));
    }

    @Test
    void finishedTaskRejectsSecondReportAndFailureStoresNoDetections() {
        AiTask task = pending();
        var det = new AiDetectionResultRequest("person", 0.9, 1.0, 1.0, 1.0, 1.0, null, null, null);
        service.submitResults(
                7L,
                new AiTaskResultRequest(
                        "FAILED", null, null, null, null, "camera lost", List.of(det)),
                null);
        assertEquals(AiTaskStatus.FAILED, task.getStatus());
        assertEquals("camera lost", task.getErrorMessage());
        verify(detections).saveAll(List.of());
        assertThrows(
                SystemException.class,
                () ->
                        service.submitResults(
                                7L,
                                new AiTaskResultRequest(
                                        "COMPLETED", null, null, null, null, null, List.of()),
                                null));
    }
}
