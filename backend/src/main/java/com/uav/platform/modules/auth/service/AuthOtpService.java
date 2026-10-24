package com.uav.platform.modules.auth.service;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.modules.auth.dto.request.*;
import com.uav.platform.modules.auth.dto.response.*;
import com.uav.platform.modules.user.entity.AppUser;

public interface AuthOtpService {

    OtpChallengeResponse requestRegisterOtp(RegisterRequest request);

    AuthResponse verifyEmailOtp(VerifyOtpRequest request);

    AuthResponse createLoginChallenge(AppUser user, String methodOverride);

    AuthResponse verifyLogin2fa(VerifyOtpRequest request);

    OtpChallengeResponse resendOtp(ResendOtpRequest request);

    OtpChallengeResponse forgotPassword(ForgotPasswordRequest request);

    MessageResponse resetPassword(ResetPasswordRequest request);

    TwoFactorStatusResponse get2faStatus(String username);

    TwoFactorSetupResponse setup2fa(String username, TwoFactorSetupRequest request);

    TwoFactorStatusResponse enable2fa(String username, TwoFactorVerifyRequest request);

    TwoFactorStatusResponse disable2fa(String username, TwoFactorDisableRequest request);
}
