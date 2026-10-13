package com.uav.platform.modules.settings.service;

import com.uav.platform.modules.settings.config.request.UpdateConfigurationRequest;
import com.uav.platform.modules.settings.config.response.SystemConfigurationResponse;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface SystemConfigService {
    List<SystemConfigurationResponse> listAll();
    SystemConfigurationResponse getByKey(String key);
    SystemConfigurationResponse update(String key, UpdateConfigurationRequest request, Authentication auth);
}
