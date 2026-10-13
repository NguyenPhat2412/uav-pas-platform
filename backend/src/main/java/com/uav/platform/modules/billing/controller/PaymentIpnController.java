package com.uav.platform.modules.billing.controller;

import com.uav.platform.modules.billing.common.InvoiceStatus;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.PaymentTransaction;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.PaymentTransactionRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.webhook.service.WebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/webhook")
public class PaymentIpnController {

    private static final Logger log = LoggerFactory.getLogger(PaymentIpnController.class);

    private final InvoiceRepository invoiceRepository;
    private final UserQuotaRepository quotaRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final WebhookService webhookService;

    public PaymentIpnController(InvoiceRepository invoiceRepository,
                                UserQuotaRepository quotaRepository,
                                PaymentTransactionRepository paymentTransactionRepository,
                                WebhookService webhookService) {
        this.invoiceRepository = invoiceRepository;
        this.quotaRepository = quotaRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.webhookService = webhookService;
    }

    /**
     * Webhook Callback tiếp nhận thông báo thanh toán tức thời (IPN) từ VietQR NAPAS 24/7
     */
    @PostMapping("/payment-ipn")
    @Transactional
    public ResponseEntity<Map<String, Object>> handlePaymentIpn(@RequestBody Map<String, Object> callbackData) {
        log.info("Received Payment IPN Callback from VietQR Gateway: {}", callbackData);

        String invoiceCode = (String) callbackData.get("invoiceCode");
        String transactionCode = (String) callbackData.getOrDefault("transactionCode", "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        Object amountObj = callbackData.get("amount");
        BigDecimal amount = amountObj != null ? new BigDecimal(amountObj.toString()) : BigDecimal.ZERO;
        String status = (String) callbackData.getOrDefault("status", "SUCCESS");

        Invoice invoice = null;
        if (invoiceCode != null) {
            invoice = invoiceRepository.findByCode(invoiceCode).orElse(null);
        }

        if (invoice == null) {
            // Thử tìm theo ID nếu có
            Object idObj = callbackData.get("invoiceId");
            if (idObj != null) {
                invoice = invoiceRepository.findById(Long.valueOf(idObj.toString())).orElse(null);
            }
        }

        if (invoice == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "status", "ERROR",
                    "code", "INVOICE_NOT_FOUND",
                    "message", "Không tìm thấy hóa đơn cần thanh toán."
            ));
        }

        // Cập nhật trạng thái hóa đơn
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        // Nạp thêm giờ bay vào UserQuota của khách hàng
        UserQuota quota = quotaRepository.findByUserId(invoice.getUser().getId()).orElse(null);
        if (quota != null) {
            // Nạp thêm giờ bay theo gói dịch vụ (mặc định tăng thêm 50 giờ)
            quota.setFlightHoursLimit(quota.getFlightHoursLimit() + 50.0);
            quota.setCycleEnd(LocalDateTime.now().plusMonths(1));
            quotaRepository.save(quota);
            log.info("Successfully recharged +50 flight hours for user: {}", invoice.getUser().getUsername());
        }

        // Lưu thông tin bản ghi giao dịch thanh toán
        PaymentTransaction txn = new PaymentTransaction(invoice, invoice.getUser(), transactionCode, amount.compareTo(BigDecimal.ZERO) > 0 ? amount : invoice.getAmount());
        txn.setGatewayName("VIETQR_NAPAS_247");
        txn.setStatus("SUCCESS");
        txn.setCompletedAt(LocalDateTime.now());
        txn.setRawIpnCallback(callbackData.toString());
        paymentTransactionRepository.save(txn);

        // Kích hoạt sự kiện Webhook ra bên ngoài
        webhookService.broadcastEvent("PAYMENT_COMPLETED", Map.of(
                "invoiceCode", invoice.getCode(),
                "transactionCode", transactionCode,
                "amount", invoice.getAmount(),
                "customerUsername", invoice.getUser().getUsername(),
                "paidAt", invoice.getPaidAt().toString(),
                "quotaNewLimit", quota != null ? quota.getFlightHoursLimit() : 0
        ));

        return ResponseEntity.ok(Map.of(
                "status", "00",
                "code", "PAYMENT_PROCESSED_SUCCESSFULLY",
                "message", "Giao dịch thanh toán VietQR hợp lệ. Đã kích hoạt hạn mức giờ bay cho khách hàng.",
                "invoiceCode", invoice.getCode(),
                "transactionCode", transactionCode
        ));
    }
}
