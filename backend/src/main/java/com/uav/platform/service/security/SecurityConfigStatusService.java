package com.uav.platform.service.security;

import com.uav.platform.dto.response.security.SecretsOverviewResponse;
import com.uav.platform.dto.response.security.SecurityPolicyResponse;

/** Read-only view of the authentication policy and secret health. Never returns secret values. */
public interface SecurityConfigStatusService {

    SecurityPolicyResponse policy();

    SecretsOverviewResponse secrets();
}
