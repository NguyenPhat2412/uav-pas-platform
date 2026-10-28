package com.uav.platform.modules.security.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.security.dto.request.SecuritySessionQueryRequest;
import com.uav.platform.modules.security.dto.request.TwoFactorResetRequest;
import com.uav.platform.modules.security.dto.response.SecurityActionResponse;
import com.uav.platform.modules.security.dto.response.SecuritySessionResponse;

import org.springframework.security.core.Authentication;

/** Admin view of user sessions and 2FA, with revocation and 2FA reset. */
public interface SecuritySessionService {

    PageResponse<SecuritySessionResponse> sessions(SecuritySessionQueryRequest query);

    SecurityActionResponse revokeUserSessions(Long userId, Authentication auth);

    SecurityActionResponse revokeAllSessions(Authentication auth);

    SecurityActionResponse resetTwoFactor(
            Long userId, TwoFactorResetRequest request, Authentication auth);
}
