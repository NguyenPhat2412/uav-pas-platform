package com.uav.platform.service.auth;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.dto.request.auth.*;
import com.uav.platform.dto.response.auth.*;
import com.uav.platform.entity.user.AppUser;

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
