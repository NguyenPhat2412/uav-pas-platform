package com.uav.platform.service.impl.billing;

import com.uav.platform.dto.record.billing.InvoiceReceiptData;
import com.uav.platform.enums.billing.InvoiceStatus;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Generates deterministic, standards-compliant ISO 32000-1 ({@code %PDF-1.4}) binary invoice and
 * payment receipt documents using built-in Type1 Helvetica fonts with clean Vietnamese-to-ASCII
 * transliteration so every desktop and mobile PDF viewer renders crisp typography without external
 * font embedding or Mojibake.
 */
public final class InvoiceReceiptOperations {

    private static final DateTimeFormatter DATE_TIME_FMT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private InvoiceReceiptOperations() {}

    public static byte[] renderPdf(InvoiceReceiptData data) {
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
        String code = fallback(data.invoiceCode(), "INV-UNKNOWN");

        StringBuilder s = new StringBuilder(4096);

        // 1. Top Navy Banner (A4 width 595, top 754..842)
        fillRect(s, 0, 754, 595, 88, "0.06 0.11 0.21");
        text(s, "F2", 18, 40, 808, "1 1 1", "UAV PAS PLATFORM");
        text(
                s,
                "F1",
                9.5,
                40,
                791,
                "0.75 0.82 0.92",
                "Unmanned Aerial Vehicle Operations & Financial Billing");
        text(s, "F2", 11, 40, 771, "0.38 0.72 0.98", "INVOICE / PAYMENT RECEIPT");

        // Status Badge Pill on top-right
        String badgeColor =
                switch (status) {
                    case PAID -> "0.09 0.60 0.30";
                    case PENDING -> "0.82 0.46 0.04";
                    case FAILED -> "0.76 0.18 0.18";
                    case CANCELLED -> "0.38 0.43 0.50";
                };
        fillRect(s, 430, 796, 125, 24, badgeColor);
        text(s, "F2", 10, 442, 804, "1 1 1", "STATUS: " + status.name());
        text(s, "F2", 9.5, 430, 773, "0.90 0.94 1.00", "No: " + code);

        // 2. Customer & Invoice Metadata (y = 612..736)
        text(s, "F2", 9, 40, 728, "0.30 0.38 0.48", "BILL TO / CUSTOMER");
        String displayName =
                notBlank(data.customerFullName())
                        ? data.customerFullName()
                        : fallback(data.customerUsername(), "Customer");
        text(s, "F2", 11, 40, 711, "0.08 0.12 0.18", truncate(displayName, 44));

        int leftY = 695;
        if (notBlank(data.customerUsername())) {
            String acctLine =
                    "Account: @"
                            + data.customerUsername()
                            + (notBlank(data.customerEmail()) ? " | " + data.customerEmail() : "");
            text(s, "F1", 9, 40, leftY, "0.22 0.27 0.34", truncate(acctLine, 54));
            leftY -= 14;
        } else if (notBlank(data.customerEmail())) {
            text(
                    s,
                    "F1",
                    9,
                    40,
                    leftY,
                    "0.22 0.27 0.34",
                    "Email: " + truncate(data.customerEmail(), 48));
            leftY -= 14;
        }
        if (notBlank(data.customerPhone())) {
            text(s, "F1", 9, 40, leftY, "0.22 0.27 0.34", "Phone: " + data.customerPhone());
            leftY -= 14;
        }
        if (notBlank(data.organizationName())) {
            text(
                    s,
                    "F2",
                    9,
                    40,
                    leftY,
                    "0.14 0.19 0.26",
                    "Company: " + truncate(data.organizationName(), 44));
            leftY -= 14;
        }
        if (notBlank(data.taxCode())) {
            text(s, "F1", 9, 40, leftY, "0.22 0.27 0.34", "Tax ID (MST): " + data.taxCode());
            leftY -= 14;
        }
        if (notBlank(data.billingAddress())) {
            for (String addrLine : wrapText("Address: " + data.billingAddress(), 50, 2)) {
                text(s, "F1", 8.5, 40, leftY, "0.30 0.35 0.42", addrLine);
                leftY -= 12;
            }
        }

        // Right Column: Invoice Metadata
        text(s, "F2", 9, 340, 728, "0.30 0.38 0.48", "INVOICE DETAILS");
        keyValueRow(s, 340, 425, 711, "Invoice Code:", code, true);
        keyValueRow(s, 340, 425, 695, "Invoice Status:", status.name(), true);
        keyValueRow(s, 340, 425, 679, "Issue Date:", formatDate(data.issuedAt()), false);
        keyValueRow(s, 340, 425, 663, "Due Date:", formatDate(data.dueDate()), false);
        keyValueRow(s, 340, 425, 647, "Paid Date:", formatDate(data.paidAt()), false);

        // Divider above table
        line(s, 40, 606, 555, 606, 0.75, "0.82 0.86 0.90");

        // 3. Line Items Table (y = 435..596)
        fillRect(s, 40, 572, 515, 24, "0.93 0.95 0.98");
        text(s, "F2", 9, 50, 580, "0.18 0.24 0.32", "ITEM / SERVICE DESCRIPTION");
        text(s, "F2", 9, 325, 580, "0.18 0.24 0.32", "REFERENCE");
        text(s, "F2", 9, 460, 580, "0.18 0.24 0.32", "AMOUNT (VND)");

        String itemTitle = fallback(data.itemTitle(), "UAV Platform Service Charge");
        String itemRef = fallback(data.itemReference(), code);
        text(s, "F2", 10, 50, 550, "0.08 0.12 0.18", truncate(itemTitle, 46));
        text(s, "F1", 9.5, 325, 550, "0.25 0.30 0.38", truncate(itemRef, 22));
        text(s, "F2", 10, 460, 550, "0.08 0.12 0.18", formatVnd(total) + " VND");

        int itemNoteY = 533;
        if (notBlank(data.notes())) {
            for (String noteLine : wrapText("Notes: " + data.notes(), 66, 2)) {
                text(s, "F1", 8.5, 50, itemNoteY, "0.38 0.43 0.50", noteLine);
                itemNoteY -= 12;
            }
        }

        line(s, 40, 504, 555, 504, 0.6, "0.86 0.89 0.92");

        // Subtotal / VAT / Total Breakdown
        text(s, "F1", 9.5, 330, 486, "0.25 0.30 0.38", "Subtotal (Excl. VAT):");
        text(s, "F1", 9.5, 455, 486, "0.12 0.16 0.22", formatVnd(subtotal) + " VND");

        text(s, "F1", 9.5, 330, 469, "0.25 0.30 0.38", "VAT (" + vatPercent + "%):");
        text(s, "F1", 9.5, 455, 469, "0.12 0.16 0.22", formatVnd(vatAmount) + " VND");

        fillRect(s, 325, 434, 230, 26, "0.06 0.11 0.21");
        text(s, "F2", 10.5, 335, 443, "1 1 1", "TOTAL AMOUNT:");
        text(s, "F2", 10.5, 442, 443, "1 1 1", formatVnd(total) + " VND");

        // 4. Payment Settlement OR Bank Transfer Reference Section (y = 268..410)
        if (status == InvoiceStatus.PAID) {
            fillRect(s, 40, 276, 515, 132, "0.94 0.99 0.96");
            strokeRect(s, 40, 276, 515, 132, 0.8, "0.52 0.82 0.64");
            text(
                    s,
                    "F2",
                    10,
                    54,
                    388,
                    "0.06 0.44 0.22",
                    "PAYMENT SETTLEMENT & RECEIPT CONFIRMATION");
            keyValueRow(s, 54, 195, 368, "Settlement Status:", "PAID (Verified)", true);
            keyValueRow(
                    s,
                    54,
                    195,
                    351,
                    "Payment Gateway:",
                    fallback(data.paymentGateway(), "VIETQR / BANK_TRANSFER"),
                    false);
            keyValueRow(
                    s,
                    54,
                    195,
                    334,
                    "Transaction Reference:",
                    fallback(data.transactionCode(), "N/A"),
                    true);
            LocalDateTime settledTime =
                    data.transactionCompletedAt() != null
                            ? data.transactionCompletedAt()
                            : data.paidAt();
            keyValueRow(s, 54, 195, 317, "Settled Timestamp:", formatDate(settledTime), false);
            keyValueRow(s, 54, 195, 300, "Settled Amount:", formatVnd(total) + " VND", true);
        } else if (status == InvoiceStatus.PENDING) {
            fillRect(s, 40, 276, 515, 132, "0.97 0.98 1.00");
            strokeRect(s, 40, 276, 515, 132, 0.8, "0.72 0.80 0.92");
            text(
                    s,
                    "F2",
                    10,
                    54,
                    388,
                    "0.10 0.26 0.52",
                    "VIETQR / BANK TRANSFER PAYMENT INSTRUCTIONS");
            String bankLabel =
                    notBlank(data.bankName())
                            ? data.bankName()
                                    + (notBlank(data.bankBin())
                                            ? " (BIN " + data.bankBin() + ")"
                                            : "")
                            : "Contact administrator for receiving bank details";
            keyValueRow(s, 54, 195, 368, "Beneficiary Bank:", truncate(bankLabel, 50), false);
            keyValueRow(
                    s,
                    54,
                    195,
                    351,
                    "Account Number:",
                    fallback(data.bankAccountNumber(), "-"),
                    true);
            keyValueRow(
                    s,
                    54,
                    195,
                    334,
                    "Account Holder:",
                    truncate(fallback(data.bankAccountName(), "-"), 50),
                    false);
            String memo =
                    notBlank(data.transferMemo())
                            ? data.transferMemo()
                            : BankTransferServiceImpl.transferContent(code);
            keyValueRow(s, 54, 195, 317, "Transfer Memo:", memo, true);
            keyValueRow(s, 54, 195, 300, "Exact Amount Due:", formatVnd(total) + " VND", true);
        } else {
            fillRect(s, 40, 316, 515, 92, "0.96 0.97 0.98");
            strokeRect(s, 40, 316, 515, 92, 0.8, "0.80 0.83 0.87");
            text(s, "F2", 10, 54, 388, "0.25 0.30 0.38", "DOCUMENT STATUS SUMMARY");
            keyValueRow(s, 54, 195, 366, "Current Status:", status.name(), true);
            keyValueRow(s, 54, 195, 348, "Invoice Code:", code, false);
        }

        // 5. Footer
        line(s, 40, 88, 555, 88, 0.6, "0.82 0.86 0.90");
        text(
                s,
                "F1",
                8.5,
                40,
                72,
                "0.42 0.47 0.54",
                "Computer-generated financial document issued by UAV PAS Platform. Valid without signature.");
        text(
                s,
                "F1",
                8.5,
                40,
                58,
                "0.42 0.47 0.54",
                "Document ID: "
                        + code
                        + " | Status: "
                        + status.name()
                        + " | Currency: VND (Vietnamese Dong)");

        return assemblePdfDocument(s.toString().getBytes(StandardCharsets.US_ASCII));
    }

    private static byte[] assemblePdfDocument(byte[] contentStreamBytes) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(contentStreamBytes.length + 1024);
        // PDF-1.4 header + 4 high-bit binary comment bytes recommended by ISO 32000-1 §7.5.2
        writeAscii(out, "%PDF-1.4\n");
        out.write('%');
        out.write(0xE2);
        out.write(0xE3);
        out.write(0xCF);
        out.write(0xD3);
        out.write('\n');

        int[] offsets = new int[7];

        offsets[1] = out.size();
        writeAscii(out, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        offsets[2] = out.size();
        writeAscii(out, "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

        offsets[3] = out.size();
        writeAscii(
                out,
                "3 0 obj\n"
                        + "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]"
                        + " /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>"
                        + " /Contents 6 0 R >>\n"
                        + "endobj\n");

        offsets[4] = out.size();
        writeAscii(
                out,
                "4 0 obj\n"
                        + "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica"
                        + " /Encoding /WinAnsiEncoding >>\n"
                        + "endobj\n");

        offsets[5] = out.size();
        writeAscii(
                out,
                "5 0 obj\n"
                        + "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold"
                        + " /Encoding /WinAnsiEncoding >>\n"
                        + "endobj\n");

        offsets[6] = out.size();
        writeAscii(out, "6 0 obj\n<< /Length " + contentStreamBytes.length + " >>\nstream\n");
        out.writeBytes(contentStreamBytes);
        writeAscii(out, "\nendstream\nendobj\n");

        int xrefOffset = out.size();
        writeAscii(out, "xref\n0 7\n");
        // Every cross-reference entry must be strictly 20 bytes per ISO 32000-1 §7.5.4.
        writeAscii(out, "0000000000 65535 f \n");
        for (int i = 1; i <= 6; i++) {
            writeAscii(out, String.format(Locale.ROOT, "%010d 00000 n \n", offsets[i]));
        }

        writeAscii(out, "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF");
        return out.toByteArray();
    }

    private static void writeAscii(ByteArrayOutputStream out, String ascii) {
        out.writeBytes(ascii.getBytes(StandardCharsets.US_ASCII));
    }

    private static void fillRect(StringBuilder s, int x, int y, int w, int h, String rgbFill) {
        s.append("q ")
                .append(rgbFill)
                .append(" rg ")
                .append(x)
                .append(' ')
                .append(y)
                .append(' ')
                .append(w)
                .append(' ')
                .append(h)
                .append(" re f Q\n");
    }

    private static void strokeRect(
            StringBuilder s, int x, int y, int w, int h, double lineWidth, String rgbStroke) {
        s.append("q ")
                .append(rgbStroke)
                .append(" RG ")
                .append(lineWidth)
                .append(" w ")
                .append(x)
                .append(' ')
                .append(y)
                .append(' ')
                .append(w)
                .append(' ')
                .append(h)
                .append(" re S Q\n");
    }

    private static void line(
            StringBuilder s, int x1, int y1, int x2, int y2, double lineWidth, String rgbStroke) {
        s.append("q ")
                .append(rgbStroke)
                .append(" RG ")
                .append(lineWidth)
                .append(" w ")
                .append(x1)
                .append(' ')
                .append(y1)
                .append(" m ")
                .append(x2)
                .append(' ')
                .append(y2)
                .append(" l S Q\n");
    }

    private static void text(
            StringBuilder s, String font, double size, int x, int y, String rgb, String rawText) {
        s.append("BT /")
                .append(font)
                .append(' ')
                .append(size)
                .append(" Tf ")
                .append(rgb)
                .append(" rg ")
                .append(x)
                .append(' ')
                .append(y)
                .append(" Td (")
                .append(escapePdfText(rawText))
                .append(") Tj ET\n");
    }

    private static void keyValueRow(
            StringBuilder s,
            int labelX,
            int valueX,
            int y,
            String label,
            String value,
            boolean boldValue) {
        text(s, "F1", 9, labelX, y, "0.32 0.37 0.44", label);
        text(
                s,
                boldValue ? "F2" : "F1",
                9.5,
                valueX,
                y,
                "0.08 0.12 0.18",
                value != null ? value : "-");
    }

    /**
     * Transliterates Vietnamese diacritics to clean printable ASCII and escapes PDF literal string
     * delimiters {@code \}, {@code (}, and {@code )}.
     */
    public static String toAsciiText(String input) {
        if (input == null || input.isEmpty()) {
            return "";
        }
        String normalized =
                Normalizer.normalize(input, Normalizer.Form.NFD)
                        .replaceAll("\\p{M}+", "")
                        .replace('đ', 'd')
                        .replace('Đ', 'D')
                        .replace("₫", "VND")
                        .replace('–', '-')
                        .replace('—', '-');
        StringBuilder clean = new StringBuilder(normalized.length());
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (c == '\r' || c == '\n' || c == '\t') {
                clean.append(' ');
            } else if (c >= 0x20 && c <= 0x7E) {
                clean.append(c);
            } else {
                clean.append(' ');
            }
        }
        return clean.toString().replaceAll(" {2,}", " ").trim();
    }

    static String escapePdfText(String input) {
        String ascii = toAsciiText(input);
        return ascii.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    static String formatVnd(BigDecimal amount) {
        BigDecimal whole =
                amount != null ? amount.setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.US);
        symbols.setGroupingSeparator(',');
        DecimalFormat df = new DecimalFormat("#,##0", symbols);
        return df.format(whole);
    }

    private static String formatDate(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(DATE_TIME_FMT) : "-";
    }

    private static boolean notBlank(String text) {
        return text != null && !text.isBlank();
    }

    private static String fallback(String text, String defaultValue) {
        return notBlank(text) ? text.trim() : defaultValue;
    }

    private static String truncate(String text, int maxChars) {
        String ascii = toAsciiText(text);
        if (ascii.length() <= maxChars) {
            return ascii;
        }
        return ascii.substring(0, Math.max(0, maxChars - 3)) + "...";
    }

    private static List<String> wrapText(String rawText, int maxWidth, int maxLines) {
        String ascii = toAsciiText(rawText);
        List<String> lines = new ArrayList<>();
        if (ascii.isEmpty()) {
            return lines;
        }
        String remaining = ascii;
        while (!remaining.isEmpty() && lines.size() < maxLines) {
            if (remaining.length() <= maxWidth) {
                lines.add(remaining);
                break;
            }
            if (lines.size() == maxLines - 1) {
                lines.add(remaining.substring(0, maxWidth - 3) + "...");
                break;
            }
            int splitAt = remaining.lastIndexOf(' ', maxWidth);
            if (splitAt <= maxWidth / 3) {
                splitAt = maxWidth;
            }
            lines.add(remaining.substring(0, splitAt).trim());
            remaining = remaining.substring(splitAt).trim();
        }
        return lines;
    }
}
