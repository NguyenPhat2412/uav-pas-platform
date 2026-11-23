package com.uav.platform.service.impl.security;

import com.uav.platform.common.util.AesCryptoRegistry;
import com.uav.platform.common.util.AesGcmCipher;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.security.DocumentEncryptionService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.GeneralSecurityException;
import java.util.Locale;
import java.util.Set;

/**
 * AES-256-GCM document and user-data encryption service backed by {@link AesGcmCipher}. Encrypted
 * binary payloads carry an 8-byte {@code UAVAES01} header so legacy unencrypted files remain
 * transparently readable.
 */
@Service
public class DocumentEncryptionServiceImpl implements DocumentEncryptionService {

    private static final Set<String> DOCUMENT_MIME_PREFIXES =
            Set.of(
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument",
                    "application/vnd.ms-excel",
                    "application/json",
                    "application/xml",
                    "application/zip",
                    "text/");

    @Override
    public byte[] encryptDocument(byte[] plainBytes) {
        if (plainBytes == null) {
            return null;
        }
        try {
            return AesCryptoRegistry.currentCipher().encryptBytes(plainBytes);
        } catch (GeneralSecurityException ex) {
            throw new SystemException(
                    "Document encryption failed",
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "DOCUMENT_ENCRYPT_FAILED");
        }
    }

    @Override
    public byte[] decryptDocument(byte[] storedBytes) {
        if (storedBytes == null) {
            return null;
        }
        try {
            return AesCryptoRegistry.currentCipher().decryptBytes(storedBytes);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new SystemException(
                    "Document decryption failed or payload was tampered",
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "DOCUMENT_DECRYPT_FAILED");
        }
    }

    @Override
    public boolean isEncrypted(byte[] data) {
        return AesGcmCipher.isEncryptedBytes(data);
    }

    @Override
    public String encryptText(String plainText) {
        if (plainText == null) {
            return null;
        }
        try {
            return AesCryptoRegistry.currentCipher().encryptTagged(plainText);
        } catch (GeneralSecurityException ex) {
            throw new SystemException(
                    "Text encryption failed",
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "TEXT_ENCRYPT_FAILED");
        }
    }

    @Override
    public String decryptText(String cipherText) {
        if (cipherText == null) {
            return null;
        }
        try {
            return AesCryptoRegistry.currentCipher().decryptTagged(cipherText);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new SystemException(
                    "Text decryption failed or payload was tampered",
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "TEXT_DECRYPT_FAILED");
        }
    }

    @Override
    public boolean isEncryptedText(String value) {
        return AesGcmCipher.isEncryptedText(value);
    }

    @Override
    public boolean shouldEncryptContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return false;
        }
        String lower = contentType.trim().toLowerCase(Locale.ROOT);
        for (String prefix : DOCUMENT_MIME_PREFIXES) {
            if (lower.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
}
