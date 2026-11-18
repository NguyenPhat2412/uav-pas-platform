package com.uav.platform.service.auth.verification;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.dto.request.auth.oauth.*;
import com.uav.platform.dto.request.auth.session.*;
import com.uav.platform.dto.request.auth.verification.*;
import com.uav.platform.dto.response.auth.session.*;
import com.uav.platform.dto.response.auth.verification.*;
import com.uav.platform.entity.user.AppUser;

public interface AuthOtpService {

    OtpChallengeResponse requestRegisterOtp(RegisterRequest request);

    AuthResponse verifyEmailOtp(VerifyOtpRequest request);

    AuthResponse createLoginChallenge(AppUser user, String methodOverride);

    AuthResponse verifyLogin2fa(VerifyOtpRequest request);

    OtpChallengeResponse resendOtp(ResendOtpRequest request);

    OtpChallengeResponse forgotPassword(ForgotPasswordRequest request);

    default OtpChallengeResponse forgotPassword(ForgotPasswordRequest request, String source) {
        return forgotPassword(request);
    }

    MessageResponse resetPassword(ResetPasswordRequest request);

    TwoFactorStatusResponse get2faStatus(String username);

    TwoFactorSetupResponse setup2fa(String username, TwoFactorSetupRequest request);

    TwoFactorStatusResponse enable2fa(String username, TwoFactorVerifyRequest request);

    TwoFactorStatusResponse disable2fa(String username, TwoFactorDisableRequest request);
}
