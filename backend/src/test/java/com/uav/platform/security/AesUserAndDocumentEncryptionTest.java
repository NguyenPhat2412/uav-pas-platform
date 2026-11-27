package com.uav.platform.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.common.util.AesCryptoRegistry;
import com.uav.platform.common.util.AesGcmCipher;
import com.uav.platform.common.util.AesStringAttributeConverter;
import com.uav.platform.dao.ICustomerBillingProfileDao;
import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.IStorageDriveNodeDao;
import com.uav.platform.dao.IStorageDriveObjectDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.record.ObjectStream;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.CustomerBillingProfile;
import com.uav.platform.entity.ProviderProfile;
import com.uav.platform.enums.ProviderType;
import com.uav.platform.enums.StorageBackendMode;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.DocumentEncryptionService;
import com.uav.platform.service.impl.GoogleDriveClientOperations;
import com.uav.platform.service.impl.HybridObjectStorageServiceImpl;
import com.uav.platform.service.impl.S3CompatibleStorageService;
import com.uav.platform.service.impl.StorageAllocationOperations;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@SpringBootTest
@Transactional
class AesUserAndDocumentEncryptionTest {

    @Autowired private IUserDao userDao;
    @Autowired private ICustomerBillingProfileDao billingProfileDao;
    @Autowired private IProviderProfileDao providerProfileDao;
    @Autowired private DocumentEncryptionService documentEncryptionService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private EntityManager entityManager;

    @Test
    void sensitiveUserPiiColumnsAreEncryptedAtRestWithAes256GcmInDatabase() {
        AppUser user =
                new AppUser(
                        "aes_user_1",
                        "aes_user_1@example.com",
                        "bcrypt-hash",
                        "0912345678",
                        "Nguyen Van AES",
                        null,
                        UserRole.ROLE_OPERATOR,
                        UserStatus.ACTIVE);
        user.setTotpSecret("JBSWY3DPEHPK3PXP");
        user.setPendingTotpSecret("PENDINGSECRET123");
        user = userDao.saveAndFlush(user);

        CustomerBillingProfile billing = new CustomerBillingProfile(user.getId());
        billing.setOrganizationName("UAV Agri Corp");
        billing.setTaxCode("0101234567");
        billing.setBillingAddress("123 Nguyen Trai, Ha Noi");
        billing.setBillingEmail("finance@uavcorp.vn");
        billing.setEmergencyContactName("Tran Thi Emergency");
        billing.setEmergencyContactPhone("0988777666");
        billingProfileDao.saveAndFlush(billing);

        ProviderProfile provider = new ProviderProfile();
        provider.setUser(user);
        provider.setSlug("aes-provider-1");
        provider.setDisplayName("AES Drone Team");
        provider.setProviderType(ProviderType.COMPANY);
        provider.setTaxOrIdNumber("0312345678");
        provider.setFlightLicenseNumber("CAAV-UAV-2026-01");
        provider.setBankName("Vietcombank");
        provider.setBankAccountNumber("0011001234567");
        provider.setBankAccountHolder("CONG TY UAV AES");
        provider.setContactPhone("0909111222");
        provider = providerProfileDao.saveAndFlush(provider);

        entityManager.clear();

        // 1. Verify raw SQL columns contain AES-256-GCM ciphertext (NOT plaintext!)
        String rawTotp =
                jdbcTemplate.queryForObject(
                        "SELECT totp_secret FROM users WHERE id = ?", String.class, user.getId());
        assertTrue(AesGcmCipher.isEncryptedText(rawTotp));
        assertFalse(rawTotp.contains("JBSWY3DPEHPK3PXP"));

        String rawTax =
                jdbcTemplate.queryForObject(
                        "SELECT tax_code FROM customer_billing_profiles WHERE user_id = ?",
                        String.class,
                        user.getId());
        assertTrue(AesGcmCipher.isEncryptedText(rawTax));
        assertFalse(rawTax.contains("0101234567"));

        String rawBank =
                jdbcTemplate.queryForObject(
                        "SELECT bank_account_number FROM provider_profiles WHERE id = ?",
                        String.class,
                        provider.getId());
        assertTrue(AesGcmCipher.isEncryptedText(rawBank));
        assertFalse(rawBank.contains("0011001234567"));

        // 2. Verify Hibernate DAOs transparently decrypt back to original plaintext
        AppUser loadedUser = userDao.getById(user.getId());
        assertEquals("JBSWY3DPEHPK3PXP", loadedUser.getTotpSecret());
        assertEquals("PENDINGSECRET123", loadedUser.getPendingTotpSecret());

        CustomerBillingProfile loadedBilling = billingProfileDao.getById(user.getId());
        assertEquals("0101234567", loadedBilling.getTaxCode());
        assertEquals("123 Nguyen Trai, Ha Noi", loadedBilling.getBillingAddress());
        assertEquals("finance@uavcorp.vn", loadedBilling.getBillingEmail());
        assertEquals("Tran Thi Emergency", loadedBilling.getEmergencyContactName());
        assertEquals("0988777666", loadedBilling.getEmergencyContactPhone());
        assertNotNull(loadedBilling.getUpdatedAt());

        ProviderProfile loadedProvider = providerProfileDao.getById(provider.getId());
        assertEquals("0312345678", loadedProvider.getTaxOrIdNumber());
        assertEquals("CAAV-UAV-2026-01", loadedProvider.getFlightLicenseNumber());
        assertEquals("0011001234567", loadedProvider.getBankAccountNumber());
        assertEquals("CONG TY UAV AES", loadedProvider.getBankAccountHolder());
        assertEquals("0909111222", loadedProvider.getContactPhone());

        // 3. Verify legacy plaintext rows remain readable without error
        jdbcTemplate.update(
                "UPDATE customer_billing_profiles SET tax_code = ? WHERE user_id = ?",
                "LEGACY-PLAIN-TAX",
                user.getId());
        entityManager.clear();
        assertEquals("LEGACY-PLAIN-TAX", billingProfileDao.getById(user.getId()).getTaxCode());
    }

    @Test
    void documentEncryptionServiceEncryptsDecryptsAndDetectsTampering() {
        byte[] pdfBytes =
                "%PDF-1.7 confidential flight permit payload".getBytes(StandardCharsets.UTF_8);
        assertFalse(documentEncryptionService.isEncrypted(pdfBytes));

        byte[] encrypted = documentEncryptionService.encryptDocument(pdfBytes);
        assertTrue(documentEncryptionService.isEncrypted(encrypted));
        assertFalse(new String(encrypted, StandardCharsets.UTF_8).contains("confidential"));

        // Re-encrypting already encrypted bytes is idempotent
        assertArrayEquals(encrypted, documentEncryptionService.encryptDocument(encrypted));

        byte[] decrypted = documentEncryptionService.decryptDocument(encrypted);
        assertArrayEquals(pdfBytes, decrypted);

        // Plaintext passthrough
        assertArrayEquals(pdfBytes, documentEncryptionService.decryptDocument(pdfBytes));
        assertNull(documentEncryptionService.encryptDocument(null));
        assertNull(documentEncryptionService.decryptDocument(null));

        // Tampered ciphertext throws SystemException
        byte[] tampered = encrypted.clone();
        tampered[tampered.length - 1] ^= 0x55;
        assertThrows(
                SystemException.class, () -> documentEncryptionService.decryptDocument(tampered));

        // Text encryption roundtrip & tamper detection
        String sealedText = documentEncryptionService.encryptText("Sensitive User Data 123");
        assertTrue(documentEncryptionService.isEncryptedText(sealedText));
        assertEquals("Sensitive User Data 123", documentEncryptionService.decryptText(sealedText));
        assertEquals("plain", documentEncryptionService.decryptText("plain"));
        assertNull(documentEncryptionService.encryptText(null));
        assertNull(documentEncryptionService.decryptText(null));
        assertThrows(
                SystemException.class,
                () -> documentEncryptionService.decryptText(AesGcmCipher.TEXT_PREFIX + "AAAA"));

        // Content type matching
        assertTrue(documentEncryptionService.shouldEncryptContentType("application/pdf"));
        assertTrue(documentEncryptionService.shouldEncryptContentType("text/csv"));
        assertFalse(documentEncryptionService.shouldEncryptContentType("image/png"));
        assertFalse(documentEncryptionService.shouldEncryptContentType(null));

        // Attribute converter null/empty handling
        AesStringAttributeConverter converter = new AesStringAttributeConverter();
        assertNull(converter.convertToDatabaseColumn(null));
        assertEquals("", converter.convertToDatabaseColumn(""));
        assertNull(converter.convertToEntityAttribute(null));
        assertEquals("", converter.convertToEntityAttribute(""));
        assertNotNull(AesCryptoRegistry.deriveKey256("custom-secret"));
    }

    @Test
    void hybridObjectStorageTransparentlyEncryptsAndDecryptsUploadedDocuments() throws Exception {
        S3CompatibleStorageService r2 = mock(S3CompatibleStorageService.class);
        IStorageDriveNodeDao nodes = mock(IStorageDriveNodeDao.class);
        IStorageDriveObjectDao objects = mock(IStorageDriveObjectDao.class);
        StorageAllocationOperations allocator = mock(StorageAllocationOperations.class);
        GoogleDriveClientOperations driveClient = mock(GoogleDriveClientOperations.class);

        when(allocator.selectNode(anyString(), anyString(), anyLong()))
                .thenReturn(Optional.empty());
        when(allocator.primaryBackend()).thenReturn(StorageBackendMode.R2);
        when(objects.findByObjectKey("docs/license.pdf")).thenReturn(Optional.empty());

        HybridObjectStorageServiceImpl storage =
                new HybridObjectStorageServiceImpl(r2, nodes, objects, allocator, driveClient);

        byte[] plainDoc = "%PDF-1.7 pilot license secret".getBytes(StandardCharsets.UTF_8);
        storage.uploadObject(
                "docs/license.pdf",
                "application/pdf",
                plainDoc.length,
                new ByteArrayInputStream(plainDoc));

        ArgumentCaptor<InputStream> uploadedCaptor = ArgumentCaptor.forClass(InputStream.class);
        verify(r2)
                .uploadObject(
                        eq("docs/license.pdf"),
                        eq("application/pdf"),
                        anyLong(),
                        uploadedCaptor.capture());
        byte[] storedCipherBytes = uploadedCaptor.getValue().readAllBytes();
        assertTrue(AesGcmCipher.isEncryptedBytes(storedCipherBytes));

        when(r2.openStream("docs/license.pdf", null))
                .thenReturn(
                        new ObjectStream(
                                new ByteArrayInputStream(storedCipherBytes),
                                "application/pdf",
                                storedCipherBytes.length,
                                null,
                                "bytes",
                                "etag1"));
        try (ObjectStream decryptedStream = storage.openStream("docs/license.pdf", null)) {
            assertArrayEquals(plainDoc, decryptedStream.body().readAllBytes());
        }
    }
}
