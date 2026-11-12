package com.uav.platform.service.reporting;

import com.uav.platform.dto.response.reporting.SlaIntelligenceResponse;

import org.springframework.security.core.Authentication;

public interface SlaIntelligenceService {

    SlaIntelligenceResponse getIntelligence(Authentication authentication);
}
