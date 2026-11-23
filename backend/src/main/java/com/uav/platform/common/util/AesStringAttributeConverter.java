package com.uav.platform.common.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.security.GeneralSecurityException;

/**
 * Transparent Hibernate {@link AttributeConverter} that encrypts sensitive user data columns at
 * rest with AES-256-GCM ({@code AES256GCM::v1::...}) while seamlessly reading legacy plaintext
 * rows.
 */
@Converter
public class AesStringAttributeConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return attribute;
        }
        try {
            return AesCryptoRegistry.currentCipher().encryptTagged(attribute);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to AES-encrypt entity attribute", ex);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return dbData;
        }
        try {
            return AesCryptoRegistry.currentCipher().decryptTagged(dbData);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Failed to AES-decrypt entity attribute", ex);
        }
    }
}
