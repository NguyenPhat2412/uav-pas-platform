package com.uav.platform.common.constant;

/** AES-GCM parameters for secrets stored encrypted in the database (AI router keys, weather API keys). */
public final class CryptoConstants {
    private CryptoConstants() {}

    public static final int AES_GCM_IV_BYTES = 12;
    public static final int AES_GCM_TAG_BITS = 128;
}
