package com.uav.platform.modules.security.service;

import com.uav.platform.modules.security.dto.response.SecretsOverviewResponse;
import com.uav.platform.modules.security.dto.response.SecurityPolicyResponse;

/** Read-only view of the authentication policy and secret health. Never returns secret values. */
public interface SecurityConfigStatusService {

    SecurityPolicyResponse policy();

    SecretsOverviewResponse secrets();
}
