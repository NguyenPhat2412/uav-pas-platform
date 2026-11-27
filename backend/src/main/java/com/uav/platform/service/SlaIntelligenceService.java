package com.uav.platform.service;

import com.uav.platform.dto.response.SlaIntelligenceResponse;

import org.springframework.security.core.Authentication;

public interface SlaIntelligenceService {

    SlaIntelligenceResponse getIntelligence(Authentication authentication);
}
