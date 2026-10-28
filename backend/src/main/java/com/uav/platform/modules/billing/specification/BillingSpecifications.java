package com.uav.platform.modules.billing.specification;

import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.PaymentTransaction;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.enums.InvoiceStatus;

import jakarta.persistence.criteria.JoinType;

import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Locale;

public final class BillingSpecifications {

    private BillingSpecifications() {}

    public static Specification<Invoice> belongsToUser(Long userId) {
        return (root, query, cb) ->
                userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Invoice> hasStatus(InvoiceStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<ServicePlan> isActive(Boolean active) {
        return (root, query, cb) -> active == null ? null : cb.equal(root.get("active"), active);
    }

    public static Specification<UserQuota> quotaForUser(Long userId) {
        return (root, query, cb) ->
                userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<PaymentTransaction> transactionStatus(String status) {
        return (root, query, cb) ->
                status == null || status.isBlank()
                        ? null
                        : cb.equal(root.get("status"), status.trim().toUpperCase(Locale.ROOT));
    }

    public static Specification<PaymentTransaction> transactionGateway(String gateway) {
        return (root, query, cb) ->
                gateway == null || gateway.isBlank()
                        ? null
                        : cb.equal(
                                root.get("gatewayName"), gateway.trim().toUpperCase(Locale.ROOT));
    }

    public static Specification<PaymentTransaction> transactionCreatedFrom(LocalDateTime from) {
        return (root, query, cb) ->
                from == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<PaymentTransaction> transactionCreatedBefore(LocalDateTime before) {
        return (root, query, cb) ->
                before == null ? null : cb.lessThan(root.get("createdAt"), before);
    }

    public static Specification<PaymentTransaction> transactionInvoice(Long invoiceId) {
        return (root, query, cb) ->
                invoiceId == null ? null : cb.equal(root.get("invoice").get("id"), invoiceId);
    }

    /** Matches transaction code, invoice code, or the customer's username, email or full name. */
    public static Specification<PaymentTransaction> transactionKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return null;
            String like =
                    "%"
                            + keyword.trim()
                                    .toLowerCase(Locale.ROOT)
                                    .replace("\\", "\\\\")
                                    .replace("%", "\\%")
                                    .replace("_", "\\_")
                            + "%";
            var invoice = root.join("invoice", JoinType.LEFT);
            var user = root.join("user", JoinType.LEFT);
            return cb.or(
                    cb.like(cb.lower(root.get("transactionCode")), like, '\\'),
                    cb.like(cb.lower(invoice.get("code")), like, '\\'),
                    cb.like(cb.lower(user.get("username")), like, '\\'),
                    cb.like(cb.lower(user.get("email")), like, '\\'),
                    cb.like(cb.lower(user.get("fullName")), like, '\\'));
        };
    }
}
