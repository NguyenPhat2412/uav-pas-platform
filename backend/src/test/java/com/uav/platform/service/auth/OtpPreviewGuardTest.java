package com.uav.platform.service.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.auth.ForgotPasswordRequest;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.mapper.auth.AuthMapper;
import com.uav.platform.mapper.user.UserMapper;
import com.uav.platform.repository.auth.AuthOtpTokenRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.impl.auth.AuthOtpServiceImpl;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

/** A reset code echoed back to whoever asked would let anyone take over any account. */
class OtpPreviewGuardTest {
    private AuthOtpServiceImpl service(boolean devPreview) {
        UserRepository users = mock(UserRepository.class);
        AppUser user = mock(AppUser.class);
        when(user.getEmail()).thenReturn("victim@example.com");
        when(users.findByEmail("victim@example.com")).thenReturn(Optional.of(user));
        AuthOtpTokenRepository tokens = mock(AuthOtpTokenRepository.class);
        when(tokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(anyString(), anyString()))
                .thenReturn(List.of());
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(encoder.encode(anyString())).thenReturn("hash");
        AuthMailService mail = new AuthMailService(null, false, "no-reply@test", devPreview);
        return new AuthOtpServiceImpl(
                users,
                tokens,
                encoder,
                mock(JwtTokenProvider.class),
                null,
                mail,
                mock(TotpService.class),
                mock(AuthMapper.class),
                mock(UserMapper.class),
                10);
    }

    @Test
    void resetCodeIsNeverReturnedByDefaultEvenWithoutSmtp() {
        var res = service(false).forgotPassword(new ForgotPasswordRequest("victim@example.com"));
        assertNull(res.devOtpPreview());
        assertNotNull(res.challengeToken());
    }

    @Test
    void developerPreviewIsOptIn() {
        var res = service(true).forgotPassword(new ForgotPasswordRequest("victim@example.com"));
        assertNotNull(res.devOtpPreview());
        assertTrue(res.devOtpPreview().matches("\\d{6}"));
    }
}
