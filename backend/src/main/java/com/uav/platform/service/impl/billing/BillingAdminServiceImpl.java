package com.uav.platform.service.impl.billing;

import static com.uav.platform.specification.billing.BillingSpecifications.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.response.billing.PaymentTransactionAdminResponse;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.PaymentTransactionRepository;
import com.uav.platform.service.billing.BillingAdminService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class BillingAdminServiceImpl implements BillingAdminService {
    private static final Pattern SENSITIVE =
            Pattern.compile(
                    "(?i)\\b(signature|checksum|secret\\w*|token|password|api[_-]?key|hmac)(\\s*[=:]\\s*\"?)([^,\\s\")}]+)");

    private final PaymentTransactionRepository payments;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PaymentTransactionAdminResponse> listTransactions(
            String status,
            String gateway,
            LocalDate from,
            LocalDate to,
            Long invoiceId,
            String keyword,
            Pageable pageable) {
        if (from != null && to != null && from.isAfter(to))
            throw SystemException.badRequest("from must not be after to", "INVALID_DATE_RANGE");
        Specification<PaymentTransaction> spec =
                Specification.allOf(
                        transactionStatus(status),
                        transactionGateway(gateway),
                        transactionCreatedFrom(from == null ? null : from.atStartOfDay()),
                        transactionCreatedBefore(to == null ? null : to.plusDays(1).atStartOfDay()),
                        transactionInvoice(invoiceId),
                        transactionKeyword(keyword));
        Pageable sorted =
                PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return PageResponse.from(
                payments.findAll(spec, sorted), BillingAdminServiceImpl::toResponse);
    }

    static PaymentTransactionAdminResponse toResponse(PaymentTransaction t) {
        var invoice = t.getInvoice();
        var user = t.getUser();
        return new PaymentTransactionAdminResponse(
                t.getId(),
                t.getTransactionCode(),
                t.getGatewayName(),
                t.getAmount(),
                t.getStatus(),
                t.getBankBin(),
                t.getBankAccountNumber(),
                invoice != null ? invoice.getId() : null,
                invoice != null ? invoice.getCode() : null,
                invoice != null && invoice.getStatus() != null ? invoice.getStatus().name() : null,
                invoice != null ? invoice.getAmount() : null,
                user != null ? user.getId() : null,
                user != null ? user.getUsername() : null,
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                redact(t.getRawIpnCallback()),
                t.getCreatedAt(),
                t.getCompletedAt());
    }

    /** Provider callbacks are kept for audit; credential-like fields are masked before display. */
    static String redact(String raw) {
        if (raw == null) return null;
        return SENSITIVE.matcher(raw).replaceAll("$1$2****");
    }
}
