package com.uav.platform.service;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.dto.request.*;
import com.uav.platform.dto.response.*;
import com.uav.platform.entity.AppUser;

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
