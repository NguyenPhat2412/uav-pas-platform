package com.uav.platform.modules.sar.service;

import com.uav.platform.modules.sar.dto.request.AiTaskDispatchRequest;
import com.uav.platform.modules.sar.dto.request.AiTaskResultRequest;
import com.uav.platform.modules.sar.dto.request.VerifyDetectionRequest;
import com.uav.platform.modules.sar.dto.response.AiDetectionResponse;
import com.uav.platform.modules.sar.dto.response.AiTaskResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface AiService {
    AiTaskResponse dispatchTask(AiTaskDispatchRequest request, Authentication authentication);

    List<AiDetectionResponse> listDetections(Long missionId, Authentication authentication);

    List<AiTaskResponse> listTasks(Long missionId, Authentication authentication);

    /** Records what the inference node found; only a PENDING/PROCESSING task accepts results. */
    AiTaskResponse submitResults(Long taskId, AiTaskResultRequest request, Authentication authentication);

    AiDetectionResponse verifyDetection(
            Long detectionId, VerifyDetectionRequest request, Authentication authentication);
}
