package com.uav.platform.service;

import com.uav.platform.dto.response.SecretsOverviewResponse;
import com.uav.platform.dto.response.SecurityPolicyResponse;

/** Read-only view of the authentication policy and secret health. Never returns secret values. */
public interface SecurityConfigStatusService {

    SecurityPolicyResponse policy();

    SecretsOverviewResponse secrets();
}
