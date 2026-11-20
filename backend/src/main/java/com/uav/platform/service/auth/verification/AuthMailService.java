package com.uav.platform.service.auth.verification;

import com.uav.platform.service.infrastructure.MailOtpSettingsService;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

/**
 * Handles outbound transactional authentication emails (OTP verification, 2FA, password reset).
 * Falls back gracefully to structured console logging + devOtpPreview when SMTP is disabled.
 */
@Service
@Slf4j
public class AuthMailService {

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String fromAddress;
    private final boolean otpDevPreview;
    private EmailDomainPolicyService emailDomainPolicy;
    private MailOtpSettingsService mailOtpSettings;

    public AuthMailService(
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:no-reply@uav.all1.vn}") String fromAddress,
            @Value("${app.auth.otp-dev-preview:false}") boolean otpDevPreview) {
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.fromAddress = fromAddress;
        this.otpDevPreview = otpDevPreview;
    }

    @Autowired(required = false)
    public void setEmailDomainPolicy(EmailDomainPolicyService emailDomainPolicy) {
        this.emailDomainPolicy = emailDomainPolicy;
    }

    @Autowired(required = false)
    public void setMailOtpSettings(MailOtpSettingsService mailOtpSettings) {
        this.mailOtpSettings = mailOtpSettings;
    }

    /**
     * Local development only: OTP codes may be echoed in API responses and logs. Off by default, because a
     * reset code returned to the requester (or written to shared logs) hands over the account.
     */
    public boolean revealsOtp() {
        return otpDevPreview;
    }

    public JavaMailSender effectiveMailSender() {
        return mailOtpSettings != null ? mailOtpSettings.currentMailSender() : mailSender;
    }

    public String effectiveFromAddress() {
        String configured =
                mailOtpSettings != null ? mailOtpSettings.effectiveFromAddress() : fromAddress;
        return StringUtils.hasText(configured) ? configured.trim() : "no-reply@uav.all1.vn";
    }

    public String effectiveSenderDisplayName() {
        return mailOtpSettings != null ? mailOtpSettings.effectiveSenderDisplayName() : null;
    }

    public boolean isMailEnabled() {
        boolean enabledFlag =
                mailOtpSettings != null ? mailOtpSettings.isMailEnabled() : mailEnabled;
        return enabledFlag && effectiveMailSender() != null;
    }

    public void sendOtpEmail(String toEmail, String purposeLabel, String otpCode, int ttlMinutes) {
        if (otpDevPreview) {
            log.info(
                    "[UAV-PAS AUTH OTP] Purpose={} | To={} | OTP={} | ExpiresIn={}m",
                    purposeLabel,
                    toEmail,
                    otpCode,
                    ttlMinutes);
        } else {
            log.info(
                    "[UAV-PAS AUTH OTP] Purpose={} | ExpiresIn={}m | mail={}",
                    purposeLabel,
                    ttlMinutes,
                    isMailEnabled());
        }

        JavaMailSender activeSender = effectiveMailSender();
        if (!isMailEnabled() || activeSender == null) {
            return;
        }

        if (EmailDomainPolicyService.isReservedOrDisposable(toEmail)
                || (emailDomainPolicy != null
                        && !emailDomainPolicy.isAllowedForOutboundSmtp(toEmail))) {
            log.warn(
                    "[UAV-PAS AUTH MAIL BLOCKED] Suppressed outbound SMTP dispatch to disallowed/reserved recipient: {}",
                    maskEmail(toEmail));
            return;
        }

        try {
            MimeMessage message = activeSender.createMimeMessage();
            if (message == null) {
                message = new MimeMessage(Session.getInstance(new Properties()));
            }
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            String from = effectiveFromAddress();
            String displayName = effectiveSenderDisplayName();
            if (StringUtils.hasText(displayName)) {
                helper.setFrom(from, displayName);
            } else {
                helper.setFrom(from);
            }
            helper.setTo(toEmail);
            helper.setSubject("[UAV PAS] Mã xác thực OTP: " + otpCode + " — " + purposeLabel);
            helper.setText(buildHtmlTemplate(purposeLabel, otpCode, ttlMinutes), true);
            activeSender.send(message);
        } catch (Exception ex) {
            log.warn(
                    "Failed to dispatch SMTP email to {} (OTP remains available in logs): {}",
                    toEmail,
                    ex.getMessage());
        }
    }

    private String buildHtmlTemplate(String purposeLabel, String otpCode, int ttlMinutes) {
        return """
                <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; background: #ffffff;">
                  <div style="background: #ab2523; color: #ffffff; padding: 14px 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                    UAV PAS · HỆ THỐNG ĐIỀU PHỐI VẬN HÀNH BAY
                  </div>
                  <div style="padding: 24px 20px; color: #0f172a;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #475569; text-transform: uppercase; font-weight: 600;">
                      %s
                    </p>
                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;">
                      Sử dụng mã OTP gồm 6 chữ số dưới đây để hoàn tất xác thực trên hệ thống UAV PAS:
                    </p>
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; text-align: center; font-family: JetBrains Mono, monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.25em; color: #ab2523;">
                      %s
                    </div>
                    <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">
                      Mã xác thực có hiệu lực trong vòng <strong>%d phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
                    </p>
                  </div>
                </div>
                """
                .formatted(purposeLabel, otpCode, ttlMinutes);
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        String[] parts = email.trim().split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        if (local.length() <= 2) {
            return local.charAt(0) + "***@" + domain;
        }
        return local.substring(0, 2) + "***" + local.charAt(local.length() - 1) + "@" + domain;
    }
}
