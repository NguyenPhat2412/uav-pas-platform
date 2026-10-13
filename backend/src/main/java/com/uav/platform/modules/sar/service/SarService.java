package com.uav.platform.modules.sar.service;

import com.uav.platform.modules.sar.common.SarStatus;
import com.uav.platform.modules.sar.config.request.SarMissionRequest;
import com.uav.platform.modules.sar.config.response.SarMissionResponse;
import org.springframework.security.core.Authentication;

public interface SarService {
    SarMissionResponse registerSar(SarMissionRequest request, Authentication authentication);
    SarMissionResponse getByMissionId(Long missionId, Authentication authentication);
    SarMissionResponse updateSarStatus(Long missionId, SarStatus status, Authentication authentication);
}
