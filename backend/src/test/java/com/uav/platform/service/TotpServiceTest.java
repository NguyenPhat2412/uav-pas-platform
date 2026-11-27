package com.uav.platform.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import java.util.OptionalLong;

class TotpServiceTest {

    @Test
    void generatesSecretsUrisAndVerifiesRfc6238Codes() {
        TotpService service = new TotpService("  UAV PAS Test  ");
        assertEquals("UAV PAS Test", service.getIssuer());

        TotpService defaultIssuer = new TotpService("   ");
        assertEquals("UAV PAS", defaultIssuer.getIssuer());

        String secret = service.generateSecret();
        assertNotNull(secret);
        assertEquals(32, secret.length());

        String uri = service.buildOtpAuthUri("pilot@uav.vn", secret);
        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("secret=" + secret));
        assertTrue(uri.contains("digits=6&period=30"));
        assertTrue(service.buildOtpAuthUri(null, secret).contains("operator"));

        String currentCode = service.generateCurrentCode(secret);
        assertTrue(currentCode.matches("^\\d{6}$"));
        assertTrue(service.verifyCode(secret, currentCode));
        assertTrue(
                service.verifyCode(
                        secret, currentCode.substring(0, 3) + " " + currentCode.substring(3)));

        OptionalLong step = service.matchStep(secret, currentCode);
        assertTrue(step.isPresent());

        // Negative validation cases
        assertFalse(service.verifyCode(null, currentCode));
        assertFalse(service.verifyCode("   ", currentCode));
        assertFalse(service.verifyCode(secret, null));
        assertFalse(service.verifyCode(secret, "12345"));
        assertFalse(service.verifyCode(secret, "abcdef"));
        assertFalse(service.verifyCode("====", currentCode));
        assertFalse(service.verifyCode("!!!", currentCode));
        assertFalse(service.verifyCode(secret, currentCode.equals("000000") ? "999999" : "000000"));
    }
}
