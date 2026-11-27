package com.uav.platform.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IAuthOtpTokenDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.ForgotPasswordRequest;
import com.uav.platform.entity.AppUser;
import com.uav.platform.mapper.AuthMapper;
import com.uav.platform.mapper.UserMapper;
import com.uav.platform.security.JwtTokenProvider;
import com.uav.platform.service.impl.AuthOtpServiceImpl;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

/** A reset code echoed back to whoever asked would let anyone take over any account. */
class OtpPreviewGuardTest {
    private AuthOtpServiceImpl service(boolean devPreview) {
        IUserDao users = mock(IUserDao.class);
        AppUser user = mock(AppUser.class);
        when(user.getEmail()).thenReturn("victim@gmail.com");
        when(users.findByEmail("victim@gmail.com")).thenReturn(Optional.of(user));
        IAuthOtpTokenDao tokens = mock(IAuthOtpTokenDao.class);
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
        var res = service(false).forgotPassword(new ForgotPasswordRequest("victim@gmail.com"));
        assertNull(res.devOtpPreview());
        assertNotNull(res.challengeToken());
    }

    @Test
    void developerPreviewIsOptIn() {
        var res = service(true).forgotPassword(new ForgotPasswordRequest("victim@gmail.com"));
        assertNotNull(res.devOtpPreview());
        assertTrue(res.devOtpPreview().matches("\\d{6}"));
    }
}
