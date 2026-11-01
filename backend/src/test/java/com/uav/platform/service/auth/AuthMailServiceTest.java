package com.uav.platform.service.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.service.impl.auth.EmailDomainPolicyServiceImpl;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

class AuthMailServiceTest {

    @Test
    void neverDispatchesSmtpToReservedOrDisposableDomains() {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        AuthMailService mail = new AuthMailService(sender, true, "no-reply@uav.all1.vn", false);
        mail.setEmailDomainPolicy(
                new EmailDomainPolicyServiceImpl(
                        EmailDomainPolicyServiceImpl.DEFAULT_ALLOWED_DOMAINS, ""));

        mail.sendOtpEmail("wxtest112945@example.invalid", "Xác thực email", "123456", 10);
        mail.sendOtpEmail("bot@example.com", "Xác thực email", "123456", 10);
        mail.sendOtpEmail("probe@example.test", "Xác thực email", "123456", 10);
        mail.sendOtpEmail("burner@mailinator.com", "Xác thực email", "123456", 10);

        verify(sender, never()).send(any(MimeMessage.class));

        mail.sendOtpEmail("pilot@example.com", "Xác thực email", "654321", 10);
        mail.sendOtpEmail("customer@gmail.com", "Xác thực email", "654321", 10);
        // An existing account on a real company domain (outside the sign-up allowlist) still gets
        // its login / reset code; sign-up codes never reach here without passing the allowlist.
        mail.sendOtpEmail("staff@company-domain.vn", "Xác thực đăng nhập", "654321", 10);

        verify(sender, times(3)).send(any(MimeMessage.class));
    }

    @Test
    void blocksReservedDomainsEvenWithoutInjectedPolicyBean() {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage())
                .thenAnswer(inv -> new MimeMessage(Session.getInstance(new Properties())));

        AuthMailService mail = new AuthMailService(sender, true, "no-reply@uav.all1.vn", false);

        mail.sendOtpEmail("wxtest112945@example.invalid", "Xác thực email", "123456", 10);
        mail.sendOtpEmail("user@example.com", "Xác thực email", "123456", 10);

        verify(sender, never()).send(any(MimeMessage.class));
    }
}
