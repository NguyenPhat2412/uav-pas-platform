package com.uav.platform.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IAiDetectionDao;
import com.uav.platform.dao.IAiTaskDao;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dto.request.AiDetectionResultRequest;
import com.uav.platform.dto.request.AiTaskResultRequest;
import com.uav.platform.entity.AiDetection;
import com.uav.platform.entity.AiTask;
import com.uav.platform.entity.Mission;
import com.uav.platform.enums.AiTaskStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.SarMapper;
import com.uav.platform.service.impl.AiServiceImpl;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.Optional;

class AiResultsTest {
    final IAiTaskDao tasks = mock(IAiTaskDao.class);
    final IAiDetectionDao detections = mock(IAiDetectionDao.class);
    final AiServiceImpl service =
            new AiServiceImpl(
                    tasks,
                    detections,
                    mock(IMissionDao.class),
                    mock(IMediaAssetDao.class),
                    null,
                    null,
                    null,
                    null,
                    Mappers.getMapper(SarMapper.class));

    private AiTask pending() {
        AiTask task = new AiTask();
        task.setMission(mock(Mission.class));
        task.setStatus(AiTaskStatus.PENDING);
        when(tasks.findByIdForUpdate(7L)).thenReturn(Optional.of(task));
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
