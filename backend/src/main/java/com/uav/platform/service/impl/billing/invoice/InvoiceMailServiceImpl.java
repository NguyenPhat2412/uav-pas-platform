package com.uav.platform.service.impl.billing.invoice;

import static com.uav.platform.common.constant.TimeConstants.DATE_TIME_MINUTE;

import com.uav.platform.dao.billing.IInvoiceDao;
import com.uav.platform.dao.billing.IPaymentTransactionDao;
import com.uav.platform.dao.user.ICustomerBillingProfileDao;
import com.uav.platform.dto.record.billing.invoice.InvoiceReceiptData;
import com.uav.platform.dto.record.billing.reconciliation.PaymentAccountSettings;
import com.uav.platform.dto.response.billing.invoice.InvoiceEmailDispatchResponse;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.entity.user.CustomerBillingProfile;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.auth.verification.AuthMailService;
import com.uav.platform.service.auth.verification.EmailDomainPolicyService;
import com.uav.platform.service.billing.invoice.InvoiceMailService;
import com.uav.platform.service.billing.reconciliation.PaymentSettingsService;
import com.uav.platform.service.impl.billing.reconciliation.BankTransferServiceImpl;
import com.uav.platform.service.infrastructure.MailOtpSettingsService;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Properties;

@Service
@Slf4j
public class InvoiceMailServiceImpl implements InvoiceMailService {

    private final IInvoiceDao invoiceRepository;
    private final IPaymentTransactionDao paymentRepository;
    private final ICustomerBillingProfileDao billingProfileRepository;
    private final PaymentSettingsService paymentSettingsService;
    private final ObjectProvider<MailOtpSettingsService> mailOtpSettingsProvider;
    private final ObjectProvider<AuthMailService> authMailProvider;
    private final ObjectProvider<JavaMailSender> fallbackMailSenderProvider;
    private final ObjectProvider<EmailDomainPolicyService> emailDomainPolicyProvider;
    private final PlatformTransactionManager transactionManager;
    private final String defaultFromAddress;
    private final boolean defaultMailEnabled;

    @Autowired
    public InvoiceMailServiceImpl(
            IInvoiceDao invoiceRepository,
            @Autowired(required = false) IPaymentTransactionDao paymentRepository,
            @Autowired(required = false) ICustomerBillingProfileDao billingProfileRepository,
            @Autowired(required = false) PaymentSettingsService paymentSettingsService,
            @Autowired(required = false)
                    ObjectProvider<MailOtpSettingsService> mailOtpSettingsProvider,
            @Autowired(required = false) ObjectProvider<AuthMailService> authMailProvider,
            @Autowired(required = false) ObjectProvider<JavaMailSender> fallbackMailSenderProvider,
            @Autowired(required = false)
                    ObjectProvider<EmailDomainPolicyService> emailDomainPolicyProvider,
            @Autowired(required = false) PlatformTransactionManager transactionManager,
            @Value("${app.mail.from:no-reply@uav.all1.vn}") String defaultFromAddress,
            @Value("${app.mail.enabled:false}") boolean defaultMailEnabled) {
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.billingProfileRepository = billingProfileRepository;
        this.paymentSettingsService = paymentSettingsService;
        this.mailOtpSettingsProvider = mailOtpSettingsProvider;
        this.authMailProvider = authMailProvider;
        this.fallbackMailSenderProvider = fallbackMailSenderProvider;
        this.emailDomainPolicyProvider = emailDomainPolicyProvider;
        this.transactionManager = transactionManager;
        this.defaultFromAddress =
                StringUtils.hasText(defaultFromAddress)
                        ? defaultFromAddress.trim()
                        : "no-reply@uav.all1.vn";
        this.defaultMailEnabled = defaultMailEnabled;
    }

    @Override
    public boolean sendForOutboxEvent(Long invoiceId, String eventType) {
        if (invoiceId == null) {
            return false;
        }
        if (!isMailEnabled()) {
            log.debug(
                    "Outbound SMTP disabled; skipping automatic invoice email for invoiceId={}, eventType={}",
                    invoiceId,
                    eventType);
            return false;
        }
        try {
            Snapshot snapshot = loadSnapshot(invoiceId);
            if (snapshot == null || !StringUtils.hasText(snapshot.defaultRecipient)) {
                return false;
            }
            String recipient = snapshot.defaultRecipient.trim();
            if (!isAllowedForOutboundSmtp(recipient)) {
                log.warn(
                        "[UAV-PAS INVOICE MAIL BLOCKED] Suppressed outbound SMTP dispatch for invoice {} to disallowed/reserved recipient: {}",
                        snapshot.receiptData.invoiceCode(),
                        AuthMailService.maskEmail(recipient));
                return false;
            }
            LocalDateTime sentAt = dispatchEmail(snapshot.receiptData, recipient);
            recordEmailSent(invoiceId, null, recipient, sentAt);
            return true;
        } catch (Exception ex) {
            log.warn(
                    "Failed to dispatch automatic invoice email for invoiceId={}, eventType={}: {}",
                    invoiceId,
                    eventType,
                    ex.getMessage());
            return false;
        }
    }

    @Override
    public InvoiceEmailDispatchResponse sendInvoiceEmail(
            Invoice invoice, String recipientEmailOverride) {
        if (invoice == null || invoice.getId() == null) {
            throw SystemException.notFound("Invoice not found");
        }
        if (!isMailEnabled()) {
            throw SystemException.conflict(
                    "Dịch vụ gửi email hiện đang tắt. Vui lòng bật cấu hình SMTP trong trang Quản trị trước khi gửi hóa đơn.",
                    "INVOICE_MAIL_DISABLED");
        }

        Snapshot snapshot = buildSnapshotFromInvoice(invoice);
        String recipient;
        if (StringUtils.hasText(recipientEmailOverride)) {
            recipient = validateExplicitRecipient(recipientEmailOverride);
        } else if (StringUtils.hasText(snapshot.defaultRecipient)) {
            recipient = snapshot.defaultRecipient.trim();
            if (!isAllowedForOutboundSmtp(recipient)) {
                throw SystemException.badRequest(
                                "Địa chỉ email nhận hóa đơn bị hạn chế hoặc không hợp lệ.",
                                "INVOICE_RECIPIENT_EMAIL_INVALID")
                        .at("recipientEmail");
            }
        } else {
            throw SystemException.badRequest(
                    "Tài khoản khách hàng chưa có địa chỉ email nhận hóa đơn.",
                    "INVOICE_RECIPIENT_EMAIL_MISSING");
        }

        try {
            LocalDateTime sentAt = dispatchEmail(snapshot.receiptData, recipient);
            recordEmailSent(invoice.getId(), invoice, recipient, sentAt);
            return new InvoiceEmailDispatchResponse(
                    invoice.getId(), invoice.getCode(), recipient, true, sentAt);
        } catch (SystemException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn(
                    "Manual invoice email dispatch failed for invoice {}: {}",
                    invoice.getCode(),
                    ex.getClass().getSimpleName());
            throw SystemException.serviceUnavailable(
                    "Không thể gửi email hóa đơn qua máy chủ SMTP. Vui lòng kiểm tra cấu hình SMTP hoặc App Password.",
                    "INVOICE_MAIL_SEND_FAILED");
        }
    }

    private static final class Snapshot {
        final InvoiceReceiptData receiptData;
        final String defaultRecipient;

        Snapshot(InvoiceReceiptData receiptData, String defaultRecipient) {
            this.receiptData = receiptData;
            this.defaultRecipient = defaultRecipient;
        }
    }

    private Snapshot loadSnapshot(Long invoiceId) {
        if (transactionManager != null) {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            tx.setReadOnly(true);
            return tx.execute(
                    status ->
                            invoiceRepository
                                    .findById(invoiceId)
                                    .map(this::buildSnapshotFromInvoice)
                                    .orElse(null));
        }
        return invoiceRepository
                .findById(invoiceId)
                .map(this::buildSnapshotFromInvoice)
                .orElse(null);
    }

    private Snapshot buildSnapshotFromInvoice(Invoice invoice) {
        AppUser customer = invoice.getUser();
        CustomerBillingProfile profile =
                (billingProfileRepository != null && customer != null && customer.getId() != null)
                        ? billingProfileRepository.findById(customer.getId()).orElse(null)
                        : null;
        PaymentTransaction settledTxn = resolveSettledTransaction(invoice.getId());
        PaymentAccountSettings settings =
                paymentSettingsService != null ? paymentSettingsService.current() : null;

        InvoiceReceiptData receiptData =
                buildReceiptData(invoice, customer, profile, settledTxn, settings);
        String recipient =
                resolveDefaultRecipient(
                        profile != null ? profile.getBillingEmail() : null,
                        customer != null ? customer.getEmail() : null);
        return new Snapshot(receiptData, recipient);
    }

    public static InvoiceReceiptData buildReceiptData(
            Invoice invoice,
            AppUser customer,
            CustomerBillingProfile profile,
            PaymentTransaction settledTxn,
            PaymentAccountSettings settings) {
        String itemTitle;
        String itemReference;
        if (invoice.getMission() != null) {
            itemTitle = "Flight Mission: " + invoice.getMission().getTitle();
            itemReference =
                    invoice.getMission().getCode() != null
                            ? invoice.getMission().getCode()
                            : "MISSION-" + invoice.getMission().getId();
        } else if (invoice.getPlan() != null) {
            itemTitle = "Service Plan: " + invoice.getPlan().getName();
            itemReference =
                    invoice.getPlan().getCode() != null
                            ? invoice.getPlan().getCode()
                            : "PLAN-" + invoice.getPlan().getId();
        } else {
            itemTitle = "UAV PAS Platform Service Charge";
            itemReference = invoice.getCode();
        }

        boolean bankConfigured = settings != null && settings.configured();
        return new InvoiceReceiptData(
                invoice.getId(),
                invoice.getCode(),
                invoice.getStatus(),
                invoice.getAmount(),
                settings != null ? settings.vatRate() : new BigDecimal("0.10"),
                invoice.getCreatedAt(),
                invoice.getDueDate(),
                invoice.getPaidAt(),
                invoice.getNotes(),
                customer != null ? customer.getUsername() : null,
                customer != null ? customer.getFullName() : null,
                customer != null ? customer.getEmail() : null,
                customer != null ? customer.getPhoneNumber() : null,
                profile != null ? profile.getOrganizationName() : null,
                profile != null ? profile.getTaxCode() : null,
                profile != null ? profile.getBillingAddress() : null,
                profile != null ? profile.getBillingEmail() : null,
                itemTitle,
                itemReference,
                settledTxn != null ? settledTxn.getGatewayName() : null,
                settledTxn != null ? settledTxn.getTransactionCode() : null,
                settledTxn != null ? settledTxn.getCompletedAt() : null,
                bankConfigured ? settings.bankName() : null,
                bankConfigured ? settings.bankBin() : null,
                bankConfigured ? settings.accountNumber() : null,
                bankConfigured ? settings.accountName() : null,
                invoice.getCode() != null
                        ? BankTransferServiceImpl.transferContent(invoice.getCode())
                        : null);
    }

    public static String resolveDefaultRecipient(String billingEmail, String userEmail) {
        if (StringUtils.hasText(billingEmail)) {
            return billingEmail.trim();
        }
        if (StringUtils.hasText(userEmail)) {
            return userEmail.trim();
        }
        return null;
    }

    private PaymentTransaction resolveSettledTransaction(Long invoiceId) {
        if (paymentRepository == null || invoiceId == null) {
            return null;
        }
        var settled =
                paymentRepository.findFirstByInvoiceIdAndStatusOrderByCompletedAtDescIdDesc(
                        invoiceId, "SUCCESS");
        if (settled != null && settled.isPresent()) {
            return settled.get();
        }
        try {
            var single = paymentRepository.findByInvoiceId(invoiceId);
            return single != null
                    ? single.filter(t -> "SUCCESS".equals(t.getStatus())).orElse(null)
                    : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private LocalDateTime dispatchEmail(InvoiceReceiptData data, String recipientEmail)
            throws Exception {
        JavaMailSender sender = effectiveMailSender();
        if (sender == null) {
            throw new IllegalStateException("JavaMailSender is unavailable");
        }
        byte[] pdfBytes = InvoiceReceiptOperations.renderPdf(data);
        String code = StringUtils.hasText(data.invoiceCode()) ? data.invoiceCode() : "INV-UNKNOWN";
        String safeCode = code.replaceAll("[^A-Za-z0-9_-]", "_");
        String pdfFilename = "invoice-" + safeCode + ".pdf";

        MimeMessage message = sender.createMimeMessage();
        if (message == null) {
            message = new MimeMessage(Session.getInstance(new Properties()));
        }
        MimeMessageHelper helper =
                new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

        String fromAddr = effectiveFromAddress();
        String displayName = effectiveSenderDisplayName();
        if (StringUtils.hasText(displayName)) {
            helper.setFrom(fromAddr, displayName);
        } else {
            helper.setFrom(fromAddr);
        }
        helper.setTo(recipientEmail);
        helper.setSubject(buildSubject(data.status(), code));
        helper.setText(buildInvoiceHtml(data, pdfFilename), true);
        helper.addAttachment(
                pdfFilename, new ByteArrayResource(pdfBytes), MediaType.APPLICATION_PDF_VALUE);

        sender.send(message);
        log.info(
                "Dispatched itemized invoice email with PDF attachment for {} to {}",
                code,
                AuthMailService.maskEmail(recipientEmail));
        return LocalDateTime.now();
    }

    private void recordEmailSent(
            Long invoiceId, Invoice targetInstance, String recipient, LocalDateTime sentAt) {
        if (targetInstance != null) {
            targetInstance.setLastEmailedAt(sentAt);
            targetInstance.setLastEmailedTo(recipient);
        }
        Runnable persist =
                () ->
                        invoiceRepository
                                .findById(invoiceId)
                                .ifPresent(
                                        inv -> {
                                            inv.setLastEmailedAt(sentAt);
                                            inv.setLastEmailedTo(recipient);
                                            invoiceRepository.save(inv);
                                        });
        if (transactionManager != null) {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.executeWithoutResult(status -> persist.run());
        } else {
            persist.run();
        }
    }

    private boolean isMailEnabled() {
        MailOtpSettingsService settings =
                mailOtpSettingsProvider == null ? null : mailOtpSettingsProvider.getIfAvailable();
        if (settings != null) {
            return settings.isMailEnabled() && effectiveMailSender() != null;
        }
        AuthMailService authMail =
                authMailProvider == null ? null : authMailProvider.getIfAvailable();
        if (authMail != null) {
            return authMail.isMailEnabled();
        }
        return defaultMailEnabled && effectiveMailSender() != null;
    }

    private JavaMailSender effectiveMailSender() {
        MailOtpSettingsService settings =
                mailOtpSettingsProvider == null ? null : mailOtpSettingsProvider.getIfAvailable();
        if (settings != null) {
            JavaMailSender sender = settings.currentMailSender();
            if (sender != null) return sender;
        }
        AuthMailService authMail =
                authMailProvider == null ? null : authMailProvider.getIfAvailable();
        if (authMail != null && authMail.effectiveMailSender() != null) {
            return authMail.effectiveMailSender();
        }
        return fallbackMailSenderProvider == null
                ? null
                : fallbackMailSenderProvider.getIfAvailable();
    }

    private String effectiveFromAddress() {
        MailOtpSettingsService settings =
                mailOtpSettingsProvider == null ? null : mailOtpSettingsProvider.getIfAvailable();
        if (settings != null && StringUtils.hasText(settings.effectiveFromAddress())) {
            return settings.effectiveFromAddress();
        }
        AuthMailService authMail =
                authMailProvider == null ? null : authMailProvider.getIfAvailable();
        if (authMail != null && StringUtils.hasText(authMail.effectiveFromAddress())) {
            return authMail.effectiveFromAddress();
        }
        return defaultFromAddress;
    }

    private String effectiveSenderDisplayName() {
        MailOtpSettingsService settings =
                mailOtpSettingsProvider == null ? null : mailOtpSettingsProvider.getIfAvailable();
        return settings != null ? settings.effectiveSenderDisplayName() : null;
    }

    private boolean isAllowedForOutboundSmtp(String email) {
        if (EmailDomainPolicyService.isReservedOrDisposable(email)) {
            return false;
        }
        EmailDomainPolicyService policy =
                emailDomainPolicyProvider == null
                        ? null
                        : emailDomainPolicyProvider.getIfAvailable();
        return policy == null || policy.isAllowedForOutboundSmtp(email);
    }

    private String validateExplicitRecipient(String rawEmail) {
        try {
            String normalized = EmailDomainPolicyService.validateSyntaxAndReserved(rawEmail);
            EmailDomainPolicyService policy =
                    emailDomainPolicyProvider == null
                            ? null
                            : emailDomainPolicyProvider.getIfAvailable();
            if (policy != null) {
                policy.validateForExistingAccount(normalized);
            }
            return normalized;
        } catch (SystemException ex) {
            throw SystemException.badRequest(
                            "Địa chỉ email nhận hóa đơn không hợp lệ hoặc bị chặn.",
                            "INVOICE_RECIPIENT_EMAIL_INVALID")
                    .at("recipientEmail");
        }
    }

    static String buildSubject(InvoiceStatus status, String code) {
        InvoiceStatus resolved = status != null ? status : InvoiceStatus.PENDING;
        String cleanCode = code.replace("\r", "").replace("\n", " ").trim();
        return switch (resolved) {
            case PAID -> "[UAV PAS] Biên lai xác nhận thanh toán — " + cleanCode;
            case PENDING -> "[UAV PAS] Hóa đơn dịch vụ bay — " + cleanCode;
            case CANCELLED -> "[UAV PAS] Thông báo hóa đơn đã hủy — " + cleanCode;
            case EXPIRED -> "[UAV PAS] Thông báo hóa đơn hết hạn — " + cleanCode;
            case FAILED -> "[UAV PAS] Thông báo giao dịch thất bại — " + cleanCode;
        };
    }

    public static String buildInvoiceHtml(InvoiceReceiptData data, String pdfFilename) {
        BigDecimal total =
                data.totalAmount() != null
                        ? data.totalAmount().setScale(0, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
        BigDecimal vatRate =
                data.vatRate() != null
                                && data.vatRate().signum() >= 0
                                && data.vatRate().compareTo(BigDecimal.ONE) <= 0
                        ? data.vatRate()
                        : new BigDecimal("0.10");
        BigDecimal[] vatSplit = BankTransferServiceImpl.splitVat(total, vatRate);
        BigDecimal subtotal = vatSplit[0];
        BigDecimal vatAmount = vatSplit[1];
        int vatPercent =
                vatRate.multiply(BigDecimal.valueOf(100))
                        .setScale(0, RoundingMode.HALF_UP)
                        .intValue();

        InvoiceStatus status = data.status() != null ? data.status() : InvoiceStatus.PENDING;
        String headerTitle =
                switch (status) {
                    case PENDING -> "HÓA ĐƠN DỊCH VỤ BAY";
                    case PAID -> "BIÊN LAI XÁC NHẬN THANH TOÁN";
                    case CANCELLED -> "THÔNG BÁO HÓA ĐƠN ĐÃ HỦY (CANCELLED)";
                    case EXPIRED -> "THÔNG BÁO HÓA ĐƠN ĐÃ HẾT HẠN (EXPIRED)";
                    case FAILED -> "THÔNG BÁO GIAO DỊCH THẤT BẠI (FAILED)";
                };
        String statusBadgeBg =
                switch (status) {
                    case PAID -> "#15803d";
                    case PENDING -> "#b45309";
                    case FAILED -> "#b91c1c";
                    case CANCELLED, EXPIRED -> "#475569";
                };
        String statusLabelVi =
                switch (status) {
                    case PAID -> "ĐÃ THANH TOÁN (PAID)";
                    case PENDING -> "CHỜ THANH TOÁN (PENDING)";
                    case CANCELLED -> "ĐÃ HỦY (CANCELLED)";
                    case EXPIRED -> "ĐÃ HẾT HẠN (EXPIRED)";
                    case FAILED -> "THẤT BẠI (FAILED)";
                };

        String code = esc(fallback(data.invoiceCode(), "INV-UNKNOWN"));
        String customerName =
                StringUtils.hasText(data.customerFullName())
                        ? esc(data.customerFullName().trim())
                        : esc(fallback(data.customerUsername(), "Quý khách hàng"));
        String usernameDisplay =
                StringUtils.hasText(data.customerUsername())
                        ? "@" + esc(data.customerUsername().trim())
                        : "-";
        String registeredEmailDisplay = esc(fallback(data.customerEmail(), "-"));

        StringBuilder billingProfileRows = new StringBuilder();
        if (StringUtils.hasText(data.billingEmail())) {
            appendRow(billingProfileRows, "Email nhận hóa đơn:", esc(data.billingEmail().trim()));
        }
        if (StringUtils.hasText(data.organizationName())) {
            appendRow(
                    billingProfileRows,
                    "Đơn vị / Doanh nghiệp:",
                    "<strong>" + esc(data.organizationName().trim()) + "</strong>");
        }
        if (StringUtils.hasText(data.taxCode())) {
            appendRow(billingProfileRows, "Mã số thuế (MST):", esc(data.taxCode().trim()));
        }
        if (StringUtils.hasText(data.billingAddress())) {
            appendRow(
                    billingProfileRows, "Địa chỉ xuất hóa đơn:", esc(data.billingAddress().trim()));
        }

        String itemTitle = esc(fallback(data.itemTitle(), "UAV PAS Platform Service Charge"));
        String itemReference = esc(fallback(data.itemReference(), code));
        String notesHtml =
                StringUtils.hasText(data.notes())
                        ? "<div style=\"margin-top: 6px; font-size: 12px; color: #64748b;\">Ghi chú: "
                                + esc(data.notes().trim())
                                + "</div>"
                        : "";

        String issuedDateStr = formatDate(data.issuedAt());
        String dueDateStr = formatDate(data.dueDate());
        String paidDateRow =
                data.paidAt() != null
                        ? "<tr><td style=\"padding: 4px 0; color: #64748b;\">Ngày thanh toán:</td>"
                                + "<td style=\"padding: 4px 0; text-align: right; font-weight: 600; color: #15803d;\">"
                                + formatDate(data.paidAt())
                                + "</td></tr>"
                        : "";

        String settlementSectionHtml = buildSettlementSection(data, status, total, code);

        return """
                <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a;">
                  <div style="background: #0f1c36; color: #ffffff; padding: 20px 24px;">
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #93c5fd; text-transform: uppercase;">
                      UAV PAS PLATFORM · TÀI CHÍNH &amp; VẬN HÀNH BAY
                    </div>
                    <div style="margin-top: 6px; font-size: 20px; font-weight: 800; letter-spacing: 0.02em;">
                      %s
                    </div>
                    <div style="margin-top: 10px;">
                      <span style="display: inline-block; background: %s; color: #ffffff; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 3px;">
                        %s
                      </span>
                      <span style="margin-left: 10px; font-size: 13px; color: #e2e8f0;">
                        Số chứng từ: <strong>%s</strong>
                      </span>
                    </div>
                  </div>

                  <div style="padding: 24px;">
                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #334155;">
                      Kính gửi <strong>%s</strong>, hệ thống UAV PAS gửi tới Quý khách thông tin chi tiết chứng từ dịch vụ như sau:
                    </p>

                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 16px; margin-bottom: 20px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 8px;">
                        Thông tin khách hàng &amp; Hồ sơ thuế GTGT
                      </div>
                      <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                        <tr>
                          <td style="padding: 3px 0; color: #64748b; width: 42%%;">Khách hàng / Tài khoản:</td>
                          <td style="padding: 3px 0; color: #0f172a; font-weight: 600;">%s (%s)</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; color: #64748b;">Email đăng ký:</td>
                          <td style="padding: 3px 0; color: #0f172a;">%s</td>
                        </tr>
                        %s
                      </table>
                    </div>

                    <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 14px 16px; margin-bottom: 20px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 8px;">
                        Thời điểm chứng từ
                      </div>
                      <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Mã hóa đơn:</td>
                          <td style="padding: 4px 0; text-align: right; font-weight: 700; font-family: monospace; color: #0f172a;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Ngày phát hành:</td>
                          <td style="padding: 4px 0; text-align: right; color: #0f172a;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px 0; color: #64748b;">Hạn thanh toán:</td>
                          <td style="padding: 4px 0; text-align: right; color: #0f172a;">%s</td>
                        </tr>
                        %s
                      </table>
                    </div>

                    <table style="width: 100%%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
                      <thead>
                        <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                          <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #334155;">Hạng mục dịch vụ</th>
                          <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #334155;">Mã tham chiếu</th>
                          <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: #334155;">Thành tiền (VNĐ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                          <td style="padding: 12px; color: #0f172a;">
                            <div style="font-weight: 600;">%s</div>
                            %s
                          </td>
                          <td style="padding: 12px; font-family: monospace; color: #334155;">%s</td>
                          <td style="padding: 12px; text-align: right; font-weight: 600; color: #0f172a;">%s VNĐ</td>
                        </tr>
                      </tbody>
                    </table>

                    <table style="width: 100%%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                      <tr>
                        <td style="padding: 4px 12px; text-align: right; color: #475569;">Tạm tính trước thuế GTGT:</td>
                        <td style="padding: 4px 12px; text-align: right; width: 160px; color: #0f172a;">%s VNĐ</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 12px; text-align: right; color: #475569;">Thuế GTGT (VAT %d%%):</td>
                        <td style="padding: 4px 12px; text-align: right; color: #0f172a;">%s VNĐ</td>
                      </tr>
                      <tr style="background: #0f1c36; color: #ffffff;">
                        <td style="padding: 10px 12px; text-align: right; font-weight: 700; text-transform: uppercase;">Tổng thanh toán:</td>
                        <td style="padding: 10px 12px; text-align: right; font-size: 15px; font-weight: 800;">%s VNĐ</td>
                      </tr>
                    </table>

                    %s

                    <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; line-height: 1.6; color: #475569;">
                      Bản PDF chính thức của chứng từ (<strong>%s</strong>) đã được đính kèm theo email này để Quý khách lưu trữ và hạch toán kế toán.
                    </div>
                  </div>
                </div>
                """
                .formatted(
                        headerTitle,
                        statusBadgeBg,
                        statusLabelVi,
                        code,
                        customerName,
                        customerName,
                        usernameDisplay,
                        registeredEmailDisplay,
                        billingProfileRows.toString(),
                        code,
                        issuedDateStr,
                        dueDateStr,
                        paidDateRow,
                        itemTitle,
                        notesHtml,
                        itemReference,
                        InvoiceReceiptOperations.formatVnd(total),
                        InvoiceReceiptOperations.formatVnd(subtotal),
                        vatPercent,
                        InvoiceReceiptOperations.formatVnd(vatAmount),
                        InvoiceReceiptOperations.formatVnd(total),
                        settlementSectionHtml,
                        esc(pdfFilename));
    }

    private static String buildSettlementSection(
            InvoiceReceiptData data, InvoiceStatus status, BigDecimal total, String escapedCode) {
        if (status == InvoiceStatus.PAID) {
            String gateway = esc(fallback(data.paymentGateway(), "VIETQR / BANK_TRANSFER"));
            String txnCode = esc(fallback(data.transactionCode(), "N/A"));
            LocalDateTime completed =
                    data.transactionCompletedAt() != null
                            ? data.transactionCompletedAt()
                            : data.paidAt();
            return """
                    <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 14px 16px;">
                      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; margin-bottom: 8px;">
                        Xác nhận đối soát thanh toán
                      </div>
                      <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                        <tr>
                          <td style="padding: 3px 0; color: #166534; width: 42%%;">Kênh thanh toán:</td>
                          <td style="padding: 3px 0; font-weight: 600; color: #14532d;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; color: #166534;">Mã giao dịch đối soát:</td>
                          <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #14532d;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; color: #166534;">Thời điểm hoàn tất:</td>
                          <td style="padding: 3px 0; color: #14532d;">%s</td>
                        </tr>
                      </table>
                    </div>
                    """
                    .formatted(gateway, txnCode, formatDate(completed));
        }

        if (status == InvoiceStatus.PENDING && StringUtils.hasText(data.bankAccountNumber())) {
            String bankDisplay =
                    esc(fallback(data.bankName(), "Ngân hàng thụ hưởng"))
                            + (StringUtils.hasText(data.bankBin())
                                    ? " (BIN " + esc(data.bankBin().trim()) + ")"
                                    : "");
            String acctNo = esc(data.bankAccountNumber().trim());
            String acctName = esc(fallback(data.bankAccountName(), "-"));
            String memo =
                    StringUtils.hasText(data.transferMemo())
                            ? esc(data.transferMemo().trim())
                            : esc(
                                    BankTransferServiceImpl.transferContent(
                                            fallback(data.invoiceCode(), "INV")));
            return """
                    <div style="background: #eff6ff; border: 1px solid #93c5fd; padding: 14px 16px;">
                      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #1e40af; margin-bottom: 8px;">
                        Hướng dẫn chuyển khoản thanh toán (VietQR / NAPAS 24/7)
                      </div>
                      <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                        <tr>
                          <td style="padding: 3px 0; color: #1e3a8a; width: 42%%;">Ngân hàng thụ hưởng:</td>
                          <td style="padding: 3px 0; font-weight: 600; color: #0f172a;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; color: #1e3a8a;">Số tài khoản:</td>
                          <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #0f172a;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; color: #1e3a8a;">Chủ tài khoản:</td>
                          <td style="padding: 3px 0; font-weight: 600; color: #0f172a;">%s</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; color: #1e3a8a;">Số tiền chính xác:</td>
                          <td style="padding: 3px 0; font-weight: 700; color: #ab2523;">%s VNĐ</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; color: #1e3a8a;">Nội dung chuyển khoản:</td>
                          <td style="padding: 3px 0; font-family: monospace; font-weight: 700; color: #1d4ed8;">%s</td>
                        </tr>
                      </table>
                    </div>
                    """
                    .formatted(
                            bankDisplay,
                            acctNo,
                            acctName,
                            InvoiceReceiptOperations.formatVnd(total),
                            memo);
        }

        return "";
    }

    private static void appendRow(StringBuilder sb, String label, String valueHtml) {
        sb.append("<tr><td style=\"padding: 3px 0; color: #64748b;\">")
                .append(label)
                .append("</td><td style=\"padding: 3px 0; color: #0f172a;\">")
                .append(valueHtml)
                .append("</td></tr>");
    }

    private static String formatDate(LocalDateTime dt) {
        return dt != null ? dt.format(DATE_TIME_MINUTE) : "-";
    }

    private static String fallback(String text, String defaultVal) {
        return StringUtils.hasText(text) ? text.trim() : defaultVal;
    }

    private static String esc(String raw) {
        return raw == null ? "" : HtmlUtils.htmlEscape(raw, StandardCharsets.UTF_8.name());
    }
}
