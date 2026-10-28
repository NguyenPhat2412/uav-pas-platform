package com.uav.platform.modules.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.OptionalLong;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * RFC 6238 TOTP (Time-based One-Time Password) service for Google Authenticator / Authy 2FA.
 */
@Service
public class TotpService {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int SECRET_BYTES = 20;
    private static final long TIME_STEP_SECONDS = 30L;
    private static final int CODE_DIGITS = 6;
    private static final int WINDOW_STEPS = 1;

    private final SecureRandom secureRandom = new SecureRandom();
    private final String issuer;

    public TotpService(@Value("${app.auth.totp-issuer:VJU UAV-PAS}") String issuer) {
        this.issuer = issuer != null && !issuer.isBlank() ? issuer.trim() : "VJU UAV-PAS";
    }

    public String getIssuer() {
        return issuer;
    }

    public String generateSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        secureRandom.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    public String buildOtpAuthUri(String accountName, String secret) {
        String safeAccount = accountName != null ? accountName.trim() : "operator";
        String label = urlEncode(issuer + ":" + safeAccount);
        String encodedIssuer = urlEncode(issuer);
        return String.format(
                "otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d",
                label, secret, encodedIssuer, CODE_DIGITS, TIME_STEP_SECONDS);
    }

    public boolean verifyCode(String base32Secret, String rawCode) {
        return matchStep(base32Secret, rawCode).isPresent();
    }

    /**
     * The 30-second time step the code belongs to, if it is valid now (one step of clock drift
     * either way). Callers store the step so the same code cannot be replayed inside the window.
     */
    public OptionalLong matchStep(String base32Secret, String rawCode) {
        if (base32Secret == null || base32Secret.isBlank() || rawCode == null) {
            return OptionalLong.empty();
        }
        String normalizedCode = rawCode.replaceAll("\\s+", "");
        if (!normalizedCode.matches("^\\d{6}$")) {
            return OptionalLong.empty();
        }
        byte[] key = decodeBase32(base32Secret);
        if (key.length == 0) {
            return OptionalLong.empty();
        }
        long currentBucket = Instant.now().getEpochSecond() / TIME_STEP_SECONDS;
        for (int offset = -WINDOW_STEPS; offset <= WINDOW_STEPS; offset++) {
            String candidate = generateCodeForCounter(key, currentBucket + offset);
            if (normalizedCode.equals(candidate)) {
                return OptionalLong.of(currentBucket + offset);
            }
        }
        return OptionalLong.empty();
    }

    public String generateCurrentCode(String base32Secret) {
        byte[] key = decodeBase32(base32Secret);
        long currentBucket = Instant.now().getEpochSecond() / TIME_STEP_SECONDS;
        return generateCodeForCounter(key, currentBucket);
    }

    private String generateCodeForCounter(byte[] key, long counter) {
        try {
            byte[] counterBytes = ByteBuffer.allocate(8).putLong(counter).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(counterBytes);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary =
                    ((hash[offset] & 0x7F) << 24)
                            | ((hash[offset + 1] & 0xFF) << 16)
                            | ((hash[offset + 2] & 0xFF) << 8)
                            | (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format("%06d", otp);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to compute TOTP code", e);
        }
    }

    private static String encodeBase32(byte[] data) {
        StringBuilder result = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = data[0];
        int next = 1;
        int bitsLeft = 8;
        while (bitsLeft > 0 || next < data.length) {
            if (bitsLeft < 5) {
                if (next < data.length) {
                    buffer <<= 8;
                    buffer |= (data[next++] & 0xFF);
                    bitsLeft += 8;
                } else {
                    int pad = 5 - bitsLeft;
                    buffer <<= pad;
                    bitsLeft += pad;
                }
            }
            int index = 0x1F & (buffer >> (bitsLeft - 5));
            bitsLeft -= 5;
            result.append(BASE32_ALPHABET.charAt(index));
        }
        return result.toString();
    }

    private static byte[] decodeBase32(String secret) {
        String clean = secret.trim().replace("=", "").replace(" ", "").toUpperCase();
        if (clean.isEmpty()) {
            return new byte[0];
        }
        byte[] out = new byte[clean.length() * 5 / 8];
        int buffer = 0;
        int bitsLeft = 0;
        int count = 0;
        for (int i = 0; i < clean.length(); i++) {
            int val = BASE32_ALPHABET.indexOf(clean.charAt(i));
            if (val < 0) {
                continue;
            }
            buffer <<= 5;
            buffer |= val & 0x1F;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out[count++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        if (count == out.length) {
            return out;
        }
        byte[] trimmed = new byte[count];
        System.arraycopy(out, 0, trimmed, 0, count);
        return trimmed;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
