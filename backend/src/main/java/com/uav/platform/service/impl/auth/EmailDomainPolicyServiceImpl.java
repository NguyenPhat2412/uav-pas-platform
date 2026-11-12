package com.uav.platform.service.impl.auth;

import com.uav.platform.error.SystemException;
import com.uav.platform.service.auth.EmailDomainPolicyService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Enforces email domain allowlist and blocklist rules configured via {@code app.auth.email.*}.
 * Leading-dot entries (such as {@code .edu.vn}) match subdomains; plain entries (such as
 * {@code gmail.com}) match the exact domain only.
 */
@Service
public class EmailDomainPolicyServiceImpl implements EmailDomainPolicyService {

    public static final String DEFAULT_ALLOWED_DOMAINS =
            "gmail.com,googlemail.com,outlook.com,outlook.com.vn,hotmail.com,live.com,msn.com,"
                    + "icloud.com,me.com,mac.com,yahoo.com,yahoo.com.vn,proton.me,protonmail.com,"
                    + "zoho.com,.edu.vn,.ac.vn,.gov.vn,.edu,.ac.jp";

    private final boolean allowAllNonBlocked;
    private final List<String> allowedRules;
    private final List<String> blockedRules;

    @Autowired
    public EmailDomainPolicyServiceImpl(
            @Value("${app.auth.email.allowed-domains:" + DEFAULT_ALLOWED_DOMAINS + "}")
                    String allowedDomainsCsv,
            @Value("${app.auth.email.blocked-domains:}") String blockedDomainsCsv) {
        List<String> parsedAllowed = parseRules(allowedDomainsCsv);
        this.allowAllNonBlocked = parsedAllowed.contains("*");
        this.allowedRules = parsedAllowed.stream().filter(rule -> !"*".equals(rule)).toList();
        this.blockedRules = parseRules(blockedDomainsCsv);
    }

    @Override
    public void validateForAuth(String rawEmail) {
        String domain = blockedCheckedDomain(rawEmail);
        if (!allowAllNonBlocked && !matchesAny(domain, allowedRules)) {
            throw SystemException.badRequest(
                            "Hệ thống hiện chỉ hỗ trợ các đuôi email phổ biến (Gmail, Outlook, iCloud, Yahoo) hoặc email giáo dục/cơ quan (.edu.vn, .ac.vn, .gov.vn).",
                            CODE_EMAIL_DOMAIN_NOT_ALLOWED)
                    .at("email");
        }
    }

    @Override
    public void validateForExistingAccount(String rawEmail) {
        blockedCheckedDomain(rawEmail);
    }

    @Override
    public boolean isAllowedForOutboundSmtp(String rawEmail) {
        try {
            validateForExistingAccount(rawEmail);
            return true;
        } catch (SystemException ex) {
            return false;
        }
    }

    /** Syntax, built-in reserved/disposable rules and the custom blocklist; returns the domain. */
    private String blockedCheckedDomain(String rawEmail) {
        String normalized = EmailDomainPolicyService.validateSyntaxAndReserved(rawEmail);
        String domain = normalized.substring(normalized.indexOf('@') + 1);
        if (matchesAny(domain, blockedRules)) {
            throw SystemException.badRequest(
                            "Tên miền email này đã bị hạn chế trên hệ thống.",
                            CODE_EMAIL_DOMAIN_BLOCKED)
                    .at("email");
        }
        return domain;
    }

    private static List<String> parseRules(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split("[,;\\s]+"))
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
    }

    private static boolean matchesAny(String domain, List<String> rules) {
        for (String rule : rules) {
            if (rule.startsWith(".")) {
                String root = rule.substring(1);
                if (domain.endsWith(rule) || (root.contains(".") && domain.equals(root))) {
                    return true;
                }
            } else if (domain.equals(rule)) {
                return true;
            }
        }
        return false;
    }
}
