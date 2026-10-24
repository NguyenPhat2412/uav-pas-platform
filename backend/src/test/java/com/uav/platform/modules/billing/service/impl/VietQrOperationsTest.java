package com.uav.platform.modules.billing.service.impl;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

class VietQrOperationsTest {

    @Test
    void crcMatchesTheCcittFalseCheckValue() {
        assertEquals("29B1", VietQrOperations.crc16("123456789"));
    }

    @Test
    void payloadCarriesAccountAmountAndMemoAndEndsWithItsOwnCrc() {
        String payload =
                VietQrOperations.build(
                        "970436",
                        "0123456789",
                        new BigDecimal("500000.00"),
                        "UAV INV INV20261022B2CFF6");
        assertTrue(payload.startsWith("000201010212"));
        assertTrue(payload.contains("0010A000000727"));
        assertTrue(payload.contains("0006970436" + "01100123456789"));
        assertTrue(payload.contains("5406500000"));
        assertTrue(payload.contains("0825UAV INV INV20261022B2CFF6"));
        String body = payload.substring(0, payload.length() - 4);
        assertTrue(body.endsWith("6304"));
        assertEquals(VietQrOperations.crc16(body), payload.substring(payload.length() - 4));
    }

    @Test
    void transferContentDropsSeparatorsAndFitsTheMemoLimit() {
        assertEquals(
                "UAV INV INV20261022B2CFF6",
                BankTransferServiceImpl.transferContent("INV-20261022-B2CFF6"));
        assertTrue(VietQrOperations.sanitizeMemo("x".repeat(40)).length() <= 25);
    }

    @Test
    void vatInclusiveAmountsSplitWithoutLosingADong() {
        BigDecimal[] split =
                BankTransferServiceImpl.splitVat(new BigDecimal("500000"), new BigDecimal("0.10"));
        assertEquals(new BigDecimal("454545"), split[0]);
        assertEquals(0, new BigDecimal("500000").compareTo(split[0].add(split[1])));
    }
}
