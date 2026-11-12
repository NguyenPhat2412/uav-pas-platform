package com.uav.platform.service.weather;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.service.impl.weather.WeatherCipherOperations;

import org.junit.jupiter.api.Test;

import java.util.Base64;

class WeatherCipherOperationsTest {
    private final WeatherCipherOperations cipher =
            new WeatherCipherOperations("unit-test-secret-at-least-32-bytes!!");

    @Test
    void roundTripsTheKey() {
        String sealed = cipher.encrypt("owm-api-key-123");
        assertNotEquals("owm-api-key-123", sealed);
        assertFalse(sealed.contains("owm-api-key"));
        assertEquals("owm-api-key-123", cipher.decrypt(sealed));
    }

    @Test
    void everyEncryptionUsesAFreshTwelveByteIv() {
        String first = cipher.encrypt("same-key");
        String second = cipher.encrypt("same-key");
        assertNotEquals(first, second);
        byte[] raw = Base64.getDecoder().decode(first);
        // 12-byte IV + 8 plaintext bytes + 16-byte (128-bit) tag.
        assertEquals(12 + 8 + 16, raw.length);
    }

    @Test
    void tamperedTextFailsTheAuthenticationTag() {
        byte[] raw = Base64.getDecoder().decode(cipher.encrypt("secret"));
        raw[raw.length - 1] ^= 0x01;
        String tampered = Base64.getEncoder().encodeToString(raw);
        assertThrows(IllegalStateException.class, () -> cipher.decrypt(tampered));
    }

    @Test
    void anotherSecretCannotOpenTheKey() {
        String sealed = cipher.encrypt("secret");
        WeatherCipherOperations other =
                new WeatherCipherOperations("a-different-secret-of-sufficient-size");
        assertThrows(IllegalStateException.class, () -> other.decrypt(sealed));
    }

    @Test
    void malformedTextIsRejected() {
        assertThrows(IllegalStateException.class, () -> cipher.decrypt("not base64 !!"));
        assertThrows(
                IllegalStateException.class,
                () -> cipher.decrypt(Base64.getEncoder().encodeToString(new byte[8])));
    }

    @Test
    void aSecretIsRequired() {
        assertThrows(IllegalStateException.class, () -> new WeatherCipherOperations(" "));
        assertThrows(IllegalStateException.class, () -> new WeatherCipherOperations(null));
    }
}
