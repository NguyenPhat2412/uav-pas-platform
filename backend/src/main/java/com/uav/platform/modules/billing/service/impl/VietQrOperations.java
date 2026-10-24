package com.uav.platform.modules.billing.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * EMVCo merchant-presented QR payload for NAPAS 247 transfers (VietQR). Built server side so the receiving
 * account always comes from configuration and the amount from the invoice, never from the browser.
 */
public final class VietQrOperations {
    /** VietQR keeps only letters, digits and spaces in the purpose field, up to 25 characters. */
    static final int MEMO_LIMIT = 25;

    private VietQrOperations() {}

    public static String build(String bankBin, String accountNumber, BigDecimal amount, String memo) {
        String beneficiary = tlv("00", bankBin) + tlv("01", accountNumber);
        String merchant = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA");
        String body = tlv("00", "01") + tlv("01", "12") + tlv("38", merchant) + tlv("53", "704")
                + tlv("54", amount.setScale(0, RoundingMode.HALF_UP).toPlainString()) + tlv("58", "VN")
                + tlv("62", tlv("08", sanitizeMemo(memo))) + "6304";
        return body + crc16(body);
    }

    public static String sanitizeMemo(String memo) {
        String clean = memo.replaceAll("[^A-Za-z0-9 ]", "");
        return clean.length() > MEMO_LIMIT ? clean.substring(0, MEMO_LIMIT) : clean;
    }

    /** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), upper-case hex. */
    static String crc16(String text) {
        int crc = 0xFFFF;
        for (byte b : text.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xFFFF;
        }
        return String.format("%04X", crc);
    }

    private static String tlv(String tag, String value) {
        return tag + String.format("%02d", value.length()) + value;
    }
}
