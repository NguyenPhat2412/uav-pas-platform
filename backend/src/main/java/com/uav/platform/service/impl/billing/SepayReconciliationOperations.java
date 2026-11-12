package com.uav.platform.service.impl.billing;

import com.uav.platform.dto.record.billing.PaymentAccountSettings;
import com.uav.platform.dto.request.billing.SepayWebhookRequest;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.InvoiceRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reconciliation helpers for Vietnamese bank-transfer webhooks (SePay / Casso compatible):
 * constant-time API key verification, receiving-account filtering, transaction-code derivation,
 * and tolerant invoice-code extraction from bank transfer memos.
 */
public final class SepayReconciliationOperations {

    private static final Pattern AUTH_SCHEME_PREFIX = Pattern.compile("(?i)^(apikey|bearer)\\s+");
    private static final Pattern HYPHENATED_INVOICE =
            Pattern.compile("(?i)\\b(INV-[A-Z0-9]+(?:-[A-Z0-9]+)+)\\b");
    private static final Pattern UAV_INV_MEMO =
            Pattern.compile("(?i)\\bUAV\\s*[-_.]?\\s*INV\\s*[-_.:]?\\s*([A-Z0-9-]{4,40})\\b");
    private static final Pattern COMPACT_INV_TOKEN =
            Pattern.compile("(?i)\\b(INV[A-Z0-9]{6,40})\\b");

    private SepayReconciliationOperations() {}

    public static boolean isValidWebhookSecret(
            String expectedSecret, String authorizationHeader, String webhookSecretHeader) {
        if (expectedSecret == null || expectedSecret.isEmpty()) {
            return false;
        }
        String candidate = extractToken(authorizationHeader, webhookSecretHeader);
        if (candidate == null || candidate.isEmpty()) {
            return false;
        }
        return MessageDigest.isEqual(
                candidate.getBytes(StandardCharsets.UTF_8),
                expectedSecret.getBytes(StandardCharsets.UTF_8));
    }

    static String extractToken(String authorizationHeader, String webhookSecretHeader) {
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            String trimmed = authorizationHeader.trim();
            return AUTH_SCHEME_PREFIX.matcher(trimmed).replaceFirst("").trim();
        }
        if (webhookSecretHeader != null && !webhookSecretHeader.isBlank()) {
            return webhookSecretHeader.trim();
        }
        return null;
    }

    public static boolean matchesReceivingAccount(
            PaymentAccountSettings settings, SepayWebhookRequest request) {
        if (settings == null
                || settings.accountNumber() == null
                || settings.accountNumber().isBlank()) {
            return true;
        }
        if (request == null
                || request.accountNumber() == null
                || request.accountNumber().isBlank()) {
            return true;
        }
        String expected = normalizeAlphanumeric(settings.accountNumber());
        if (expected.isEmpty()) {
            return true;
        }
        String actualMain = normalizeAlphanumeric(request.accountNumber());
        String actualSub = normalizeAlphanumeric(request.subAccount());
        return expected.equals(actualMain) || (!actualSub.isEmpty() && expected.equals(actualSub));
    }

    public static String deriveTransactionCode(SepayWebhookRequest request) {
        if (request != null && request.id() != null) {
            return "SEPAY-" + request.id();
        }
        if (request != null
                && request.referenceCode() != null
                && !request.referenceCode().isBlank()) {
            String trimmed = request.referenceCode().trim();
            if (trimmed.length() > 100) {
                throw SystemException.badRequest(
                        "Bank referenceCode exceeds maximum length", "INVALID_TRANSACTION_CODE");
            }
            return trimmed;
        }
        throw SystemException.badRequest(
                "Bank webhook id or referenceCode is required", "INVALID_TRANSACTION_CODE");
    }

    public static Optional<Invoice> resolveInvoice(
            SepayWebhookRequest request, InvoiceRepository invoiceRepository) {
        if (request == null || invoiceRepository == null) {
            return Optional.empty();
        }
        List<String> sources =
                List.of(
                        orEmpty(request.code()),
                        orEmpty(request.content()),
                        orEmpty(request.description()));

        // 1. Explicit hyphenated code (e.g. INV-20261105-ABC123 or INV-MISSION-42)
        for (String text : sources) {
            if (text.isBlank()) continue;
            Matcher m = HYPHENATED_INVOICE.matcher(text);
            while (m.find()) {
                String exact = m.group(1).toUpperCase(Locale.ROOT);
                Optional<Invoice> byExact = invoiceRepository.findByCode(exact);
                if (byExact.isPresent()) {
                    return byExact;
                }
                Optional<Invoice> byNorm =
                        invoiceRepository.findByNormalizedCode(exact.replace("-", ""));
                if (byNorm.isPresent()) {
                    return byNorm;
                }
            }
        }

        // 2. VietQR transfer memo format: "UAV INV <codeWithoutHyphens>"
        for (String text : sources) {
            if (text.isBlank()) continue;
            Matcher m = UAV_INV_MEMO.matcher(text);
            while (m.find()) {
                String raw = m.group(1).toUpperCase(Locale.ROOT);
                if (raw.contains("-")) {
                    Optional<Invoice> byExact = invoiceRepository.findByCode(raw);
                    if (byExact.isPresent()) {
                        return byExact;
                    }
                }
                String normalized = normalizeAlphanumeric(raw);
                if (!normalized.isEmpty()) {
                    Optional<Invoice> byNorm = invoiceRepository.findByNormalizedCode(normalized);
                    if (byNorm.isPresent()) {
                        return byNorm;
                    }
                    if (!normalized.startsWith("INV")) {
                        Optional<Invoice> prefixed =
                                invoiceRepository.findByNormalizedCode("INV" + normalized);
                        if (prefixed.isPresent()) {
                            return prefixed;
                        }
                    }
                }
            }
        }

        // 3. Fallback compact INV[A-Z0-9]{6,} token anywhere in code/content/description
        for (String text : sources) {
            if (text.isBlank()) continue;
            Matcher m = COMPACT_INV_TOKEN.matcher(text);
            while (m.find()) {
                String normalized = normalizeAlphanumeric(m.group(1));
                Optional<Invoice> byNorm = invoiceRepository.findByNormalizedCode(normalized);
                if (byNorm.isPresent()) {
                    return byNorm;
                }
            }
        }

        return Optional.empty();
    }

    public static String summarizePayload(SepayWebhookRequest request) {
        if (request == null) {
            return "";
        }
        return "SepayWebhook{id="
                + request.id()
                + ", gateway="
                + safeText(request.gateway())
                + ", transactionDate="
                + safeText(request.transactionDate())
                + ", accountNumber="
                + safeText(request.accountNumber())
                + ", subAccount="
                + safeText(request.subAccount())
                + ", transferType="
                + safeText(request.transferType())
                + ", transferAmount="
                + request.transferAmount()
                + ", referenceCode="
                + safeText(request.referenceCode())
                + ", code="
                + safeText(request.code())
                + ", content="
                + safeText(request.content())
                + ", description="
                + safeText(request.description())
                + "}";
    }

    static String normalizeAlphanumeric(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }

    private static String orEmpty(String value) {
        return value != null ? value : "";
    }

    private static String safeText(String value) {
        return value == null ? "" : value.replace('\n', ' ').replace('\r', ' ').trim();
    }
}
