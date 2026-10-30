package com.uav.platform.modules.auth.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.nio.charset.StandardCharsets;

/** The decoy reset challenge must hash with real BCrypt, which refuses inputs over 72 bytes. */
class DecoyResetSecretTest {

    @Test
    void decoySecretFitsBcryptAndNeverMatchesASixDigitCode() {
        String secret = AuthOtpServiceImpl.decoyResetSecret();
        assertThat(secret.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(72);

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        String hash = encoder.encode(secret);
        assertThat(encoder.matches(secret, hash)).isTrue();
        assertThat(encoder.matches("123456", hash)).isFalse();
    }
}
