package com.uav.platform.service.impl;

import com.uav.platform.common.util.Hashing;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.record.IpnSignaturePayload;
import com.uav.platform.dto.request.PaymentIpnRequest;
import com.uav.platform.dto.response.PaymentIpnResponse;
import com.uav.platform.dto.response.PaymentResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Invoice;
import com.uav.platform.entity.PaymentTransaction;
import com.uav.platform.entity.ServicePlan;
import com.uav.platform.enums.InvoiceStatus;
import com.uav.platform.enums.PaymentMethod;
import com.uav.platform.error.SystemException;

import jakarta.persistence.criteria.Predicate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class BillingPaymentOperations {

    private static final DateTimeFormatter INVOICE_DATE_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd");

    private BillingPaymentOperations() {}

    static HibernateSpecification<Invoice> invoiceFilter(
            Long ownerId, InvoiceStatus status, boolean overdue, LocalDateTime now) {
        return (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            if (ownerId != null) where.add(cb.equal(root.get("user").get("id"), ownerId));
            if (status != null) where.add(cb.equal(root.get("status"), status));
            if (overdue) {
                where.add(cb.equal(root.get("status"), InvoiceStatus.PENDING));
                where.add(cb.lessThan(root.get("dueDate"), now));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
    }

    static BigDecimal wholeDong(BigDecimal amount) {
        return amount == null ? null : amount.setScale(0, RoundingMode.HALF_UP);
    }

    static String newInvoiceCode() {
        return "INV-"
                + LocalDateTime.now().format(INVOICE_DATE_FMT)
                + "-"
                + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    static Invoice buildPlanInvoice(AppUser user, ServicePlan plan, int dueDays) {
        return new Invoice(
                newInvoiceCode(),
                user,
                null,
                plan,
                wholeDong(plan.getPrice()),
                LocalDateTime.now().plusDays(dueDays),
                "PLAN_SUBSCRIPTION:" + plan.getCode());
    }

    static PaymentResponse paidPaymentResponse(
            Invoice invoice, PaymentTransaction settled, PaymentMethod method) {
        return new PaymentResponse(
                settled != null ? settled.getId() : null,
                settled != null ? settled.getTransactionCode() : null,
                invoice.getId(),
                invoice.getCode(),
                invoice.getAmount(),
                method,
                "PAID",
                InvoiceStatus.PAID,
                invoice.getPaidAt(),
                null);
    }

    static PaymentResponse pendingTransferResponse(
            Invoice invoice,
            BigDecimal totalDong,
            PaymentMethod method,
            String transferMemo,
            String qrPayload) {
        return new PaymentResponse(
                null,
                transferMemo,
                invoice.getId(),
                invoice.getCode(),
                totalDong,
                method,
                "AWAITING_TRANSFER",
                InvoiceStatus.PENDING,
                null,
                qrPayload);
    }

    static void validateIpnSuccessPayload(PaymentIpnRequest request) {
        if (!"SUCCESS".equals(request.status())
                || request.transactionCode() == null
                || request.transactionCode().isBlank()
                || request.transactionCode().length() > 100) {
            throw SystemException.badRequest(
                    "Successful provider transaction and transaction code are required");
        }
    }

    static void validateIpnInvoiceIdentifiers(Invoice invoice, PaymentIpnRequest request) {
        String invoiceCode = request.invoiceCode();
        if ((invoiceCode != null
                        && !invoiceCode.isBlank()
                        && !invoiceCode.equals(invoice.getCode()))
                || (request.invoiceId() != null && !request.invoiceId().equals(invoice.getId()))) {
            throw SystemException.conflict("Invoice identifiers do not match");
        }
    }

    static void validateDuplicateIpnTransaction(
            PaymentTransaction existing, Invoice invoice, PaymentIpnRequest request) {
        if (!existing.getInvoice().getId().equals(invoice.getId())
                || request.amount() == null
                || existing.getAmount().compareTo(request.amount()) != 0
                || !"SUCCESS".equals(existing.getStatus())) {
            throw SystemException.conflict(
                    "Payment transaction code already used with different payload");
        }
    }

    static PaymentTransaction buildTransaction(
            Invoice invoice,
            String transactionCode,
            BigDecimal amount,
            String gateway,
            String bankAccountNumber,
            String status,
            String rawCallback,
            LocalDateTime completedAt) {
        PaymentTransaction txn =
                PaymentTransactionOperations.create(
                        invoice,
                        invoice.getUser(),
                        transactionCode,
                        amount != null ? amount : BigDecimal.ZERO);
        txn.setGatewayName(gateway);
        if (bankAccountNumber != null && !bankAccountNumber.isBlank()) {
            String trimmedAcct = bankAccountNumber.trim();
            txn.setBankAccountNumber(
                    trimmedAcct.length() > 50 ? trimmedAcct.substring(0, 50) : trimmedAcct);
        }
        txn.setStatus(status);
        if (completedAt != null) {
            txn.setCompletedAt(completedAt);
        }
        txn.setRawIpnCallback(rawCallback);
        return txn;
    }

    static String validateCancelReason(String reason) {
        String note = reason == null || reason.isBlank() ? null : reason.trim();
        if (note != null && note.length() > 200) {
            throw SystemException.badRequest(
                    "Reason is too long", "INVOICE_CANCEL_REASON_TOO_LONG");
        }
        return note;
    }

    static void applyCloseStatus(Invoice invoice, InvoiceStatus status, String note) {
        invoice.setStatus(status);
        String joined = (invoice.getNotes() == null ? "" : invoice.getNotes() + " ") + note.trim();
        invoice.setNotes(joined.length() > 500 ? joined.substring(0, 500) : joined);
    }

    static PaymentIpnResponse paymentResult(Invoice invoice, String transactionCode) {
        return new PaymentIpnResponse(
                "00",
                "PAYMENT_PROCESSED_SUCCESSFULLY",
                "Đã ghi nhận thanh toán có xác thực từ nhà cung cấp.",
                invoice.getCode(),
                transactionCode);
    }

    static String computeIpnSignature(String ipnSecret, PaymentIpnRequest request) {
        String canonical = IpnSignaturePayload.from(request).canonical();
        return Hashing.hmacSha256Hex(ipnSecret, canonical);
    }

    static boolean isValidIpnSignature(
            String ipnSecret, PaymentIpnRequest request, String providedSignature) {
        if (providedSignature == null || providedSignature.isBlank()) {
            return false;
        }
        byte[] providedBytes = providedSignature.trim().getBytes(StandardCharsets.UTF_8);
        String expectedHmac = computeIpnSignature(ipnSecret, request);
        return MessageDigest.isEqual(providedBytes, expectedHmac.getBytes(StandardCharsets.UTF_8));
    }
}
