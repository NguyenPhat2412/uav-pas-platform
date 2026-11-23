package com.uav.platform.service.security;

/**
 * AES-256-GCM encryption contract for sensitive user documents and protected text payloads.
 */
public interface DocumentEncryptionService {

    byte[] encryptDocument(byte[] plainBytes);

    byte[] decryptDocument(byte[] storedBytes);

    boolean isEncrypted(byte[] data);

    String encryptText(String plainText);

    String decryptText(String cipherText);

    boolean isEncryptedText(String value);

    boolean shouldEncryptContentType(String contentType);
}
