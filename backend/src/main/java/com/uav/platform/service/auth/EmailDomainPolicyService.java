package com.uav.platform.service.auth;

import com.uav.platform.error.SystemException;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Guards authentication & OTP flows against bogus, RFC-reserved, disposable, or non-allowlisted
 * email domains before any database challenge or outbound SMTP delivery occurs.
 */
public interface EmailDomainPolicyService {

    String CODE_EMAIL_INVALID = "REGISTER_EMAIL_INVALID";
    String CODE_EMAIL_DOMAIN_BLOCKED = "REGISTER_EMAIL_DOMAIN_BLOCKED";
    String CODE_EMAIL_DOMAIN_NOT_ALLOWED = "REGISTER_EMAIL_DOMAIN_NOT_ALLOWED";

    int EMAIL_MAX_LENGTH = 255;
    int LOCAL_PART_MAX_LENGTH = 64;

    Pattern LOCAL_PART_PATTERN =
            Pattern.compile("^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$");
    Pattern DOMAIN_LABEL_PATTERN = Pattern.compile("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$");
    Pattern TLD_PATTERN = Pattern.compile("^[a-z]{2,63}$");

    /**
     * RFC 2606 / RFC 6761 reserved names, internal placeholders, and common disposable/10-minute
     * mail services. Matched both exactly and on any subdomain ({@code *.domain}).
     */
    Set<String> BUILT_IN_BLOCKED_DOMAINS =
            Set.of(
                    "localhost",
                    "example.com",
                    "example.org",
                    "example.net",
                    "example.edu",
                    "uav-platform.com",
                    "mailinator.com",
                    "guerrillamail.com",
                    "guerrillamailblock.com",
                    "sharklasers.com",
                    "grr.la",
                    "yopmail.com",
                    "yopmail.fr",
                    "yopmail.net",
                    "tempmail.com",
                    "temp-mail.org",
                    "temp-mail.io",
                    "10minutemail.com",
                    "10minutemail.net",
                    "trashmail.com",
                    "trashmail.net",
                    "dispostable.com",
                    "maildrop.cc",
                    "getnada.com",
                    "nada.email",
                    "throwawaymail.com",
                    "mohmal.com",
                    "fakeinbox.com",
                    "mailnesia.com",
                    "mintemail.com");

    /** Reserved top-level pseudo-domains that never route on the public internet. */
    Set<String> BUILT_IN_BLOCKED_TLDS =
            Set.of("invalid", "test", "example", "localhost", "local", "internal", "onion", "arpa");

    /**
     * For a new sign-up: validates email syntax, built-in reserved/disposable rules, custom
     * blocklist, and configured allowlist. Throws a 400 {@link SystemException} pointing at field
     * {@code email} on violation.
     */
    void validateForAuth(String rawEmail);

    /**
     * For an address that may already own an account (password reset, login and 2FA codes): syntax,
     * reserved/disposable and the custom blocklist only. The allowlist is a sign-up rule; applying
     * it here would lock out existing users on company or Google Workspace domains.
     */
    void validateForExistingAccount(String rawEmail);

    /**
     * {@code true} when {@code rawEmail} may receive a real email: not malformed, reserved,
     * disposable or blocklisted. The allowlist is not consulted (see {@link
     * #validateForExistingAccount}); sign-up codes only get here after {@link #validateForAuth}.
     */
    boolean isAllowedForOutboundSmtp(String rawEmail);

    /**
     * Normalizes an email address (trimmed, lower-case) and enforces strict syntax plus built-in
     * RFC-reserved / disposable domain blocking even when no Spring context is wired.
     */
    static String validateSyntaxAndReserved(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
        if (email.isEmpty() || email.length() > EMAIL_MAX_LENGTH) {
            throw invalidEmail();
        }
        int at = email.indexOf('@');
        if (at <= 0 || at != email.lastIndexOf('@') || at == email.length() - 1) {
            throw invalidEmail();
        }
        String local = email.substring(0, at);
        String domain = email.substring(at + 1);
        if (local.length() > LOCAL_PART_MAX_LENGTH
                || !LOCAL_PART_PATTERN.matcher(local).matches()) {
            throw invalidEmail();
        }
        if (isBuiltInBlockedDomain(domain)) {
            throw blockedDomain();
        }
        String[] labels = domain.split("\\.", -1);
        if (labels.length < 2) {
            throw invalidEmail();
        }
        for (String label : labels) {
            if (label.isEmpty() || !DOMAIN_LABEL_PATTERN.matcher(label).matches()) {
                throw invalidEmail();
            }
        }
        if (!TLD_PATTERN.matcher(labels[labels.length - 1]).matches()) {
            throw invalidEmail();
        }
        return email;
    }

    /** True when the email is malformed or targets an RFC-reserved/test/disposable domain. */
    static boolean isReservedOrDisposable(String rawEmail) {
        try {
            validateSyntaxAndReserved(rawEmail);
            return false;
        } catch (SystemException ex) {
            return true;
        }
    }

    static boolean isBuiltInBlockedDomain(String normalizedDomain) {
        if (normalizedDomain == null || normalizedDomain.isBlank()) {
            return false;
        }
        for (String blocked : BUILT_IN_BLOCKED_DOMAINS) {
            if (normalizedDomain.equals(blocked) || normalizedDomain.endsWith("." + blocked)) {
                return true;
            }
        }
        int lastDot = normalizedDomain.lastIndexOf('.');
        String tld = lastDot >= 0 ? normalizedDomain.substring(lastDot + 1) : normalizedDomain;
        return BUILT_IN_BLOCKED_TLDS.contains(tld);
    }

    private static SystemException invalidEmail() {
        return SystemException.badRequest("Địa chỉ email không hợp lệ.", CODE_EMAIL_INVALID)
                .at("email");
    }

    private static SystemException blockedDomain() {
        return SystemException.badRequest(
                        "Tên miền email thử nghiệm hoặc tạm thời không được phép sử dụng trên hệ thống.",
                        CODE_EMAIL_DOMAIN_BLOCKED)
                .at("email");
    }
}
