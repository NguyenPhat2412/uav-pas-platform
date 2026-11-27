package com.uav.platform.service;

import com.uav.platform.dto.request.UpdateConfigurationRequest;
import com.uav.platform.dto.response.PublicSiteInfoResponse;
import com.uav.platform.dto.response.SystemConfigurationHistoryResponse;
import com.uav.platform.dto.response.SystemConfigurationResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface SystemConfigService {
    List<SystemConfigurationResponse> listAll();

    SystemConfigurationResponse getByKey(String key);

    String valueOrDefault(String key, String fallback);

    SystemConfigurationResponse update(
            String key, UpdateConfigurationRequest request, Authentication auth);

    /** Newest first, at most {@code limit} entries. */
    List<SystemConfigurationHistoryResponse> history(String key, int limit);

    /** Only settings flagged public; never includes private keys. */
    PublicSiteInfoResponse publicSiteInfo();
}
