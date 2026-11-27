package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.SecuritySessionQueryRequest;
import com.uav.platform.dto.request.TwoFactorResetRequest;
import com.uav.platform.dto.response.SecurityActionResponse;
import com.uav.platform.dto.response.SecuritySessionResponse;

import org.springframework.security.core.Authentication;

/** Admin view of user sessions and 2FA, with revocation and 2FA reset. */
public interface SecuritySessionService {

    PageResponse<SecuritySessionResponse> sessions(SecuritySessionQueryRequest query);

    SecurityActionResponse revokeUserSessions(Long userId, Authentication auth);

    SecurityActionResponse revokeAllSessions(Authentication auth);

    SecurityActionResponse resetTwoFactor(
            Long userId, TwoFactorResetRequest request, Authentication auth);
}
