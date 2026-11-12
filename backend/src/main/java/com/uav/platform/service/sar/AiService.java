package com.uav.platform.service.sar;

import com.uav.platform.dto.request.sar.AiTaskDispatchRequest;
import com.uav.platform.dto.request.sar.AiTaskResultRequest;
import com.uav.platform.dto.request.sar.VerifyDetectionRequest;
import com.uav.platform.dto.response.sar.AiDetectionResponse;
import com.uav.platform.dto.response.sar.AiTaskResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface AiService {
    AiTaskResponse dispatchTask(AiTaskDispatchRequest request, Authentication authentication);

    List<AiDetectionResponse> listDetections(Long missionId, Authentication authentication);

    List<AiTaskResponse> listTasks(Long missionId, Authentication authentication);

    /** Records what the inference node found; only a PENDING/PROCESSING task accepts results. */
    AiTaskResponse submitResults(
            Long taskId, AiTaskResultRequest request, Authentication authentication);

    AiDetectionResponse verifyDetection(
            Long detectionId, VerifyDetectionRequest request, Authentication authentication);
}
