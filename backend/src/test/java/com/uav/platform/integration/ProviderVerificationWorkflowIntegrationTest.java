package com.uav.platform.integration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IProviderDocumentDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.ProviderDocumentCreateRequest;
import com.uav.platform.dto.request.ProviderDocumentModerationRequest;
import com.uav.platform.dto.request.ProviderModerationRequest;
import com.uav.platform.dto.request.ProviderOnboardingRequest;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.MediaAsset;
import com.uav.platform.enums.MediaType;
import com.uav.platform.enums.ProviderDocumentStatus;
import com.uav.platform.enums.ProviderDocumentType;
import com.uav.platform.enums.ProviderType;
import com.uav.platform.enums.ProviderVerificationStatus;
import com.uav.platform.enums.UserRole;
import com.uav.platform.enums.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.MarketplaceAdminService;
import com.uav.platform.service.MarketplaceProviderService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_provider_kyc;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class ProviderVerificationWorkflowIntegrationTest {

    @Autowired WebApplicationContext context;
    @Autowired IUserDao users;
    @Autowired IProviderDocumentDao providerDocuments;
    @Autowired IMediaAssetDao mediaAssets;
    @Autowired MarketplaceProviderService providerService;
    @Autowired MarketplaceAdminService adminService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    MockMvc mvc;

    @BeforeEach
    void setupMvc() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void providerVerificationRequiredDocumentsAdminDocumentReviewAndResubmissionLifecycle()
            throws Exception {
        AppUser admin = createUser("kyc_admin_" + suffix(), UserRole.ROLE_ADMIN);
        AppUser companyOwner = createUser("kyc_company_" + suffix(), UserRole.ROLE_PILOT);
        AppUser individualOwner = createUser("kyc_indiv_" + suffix(), UserRole.ROLE_PILOT);

        // 1. Company creates DRAFT profile (submitForReview = false)
        var companyProfile =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                "VietSky Enterprise Survey",
                                ProviderType.COMPANY,
                                "0318889991",
                                "CAAV-CO-2026",
                                "Doanh nghiệp bay khảo sát hạ tầng.",
                                "Hà Nội",
                                150,
                                "0901234567",
                                "Vietcombank",
                                "0011002233445",
                                "CONG TY VIETSKY",
                                false),
                        companyOwner.getUsername());
        assertEquals(ProviderVerificationStatus.DRAFT, companyProfile.verificationStatus());

        // 2. Submitting without required documents fails with REQUIRED_DOCUMENTS_MISSING
        SystemException missingErr =
                assertThrows(
                        SystemException.class,
                        () -> providerService.submitForVerification(companyOwner.getUsername()));
        assertEquals("REQUIRED_DOCUMENTS_MISSING", missingErr.getCode());
        assertTrue(missingErr.getMessage().contains("BUSINESS_LICENSE"));
        assertTrue(missingErr.getMessage().contains("TAX_SETTLEMENT_DOSSIER"));

        // 3. Upload confirmed MediaAsset and attach all 7 mandatory COMPANY documents
        MediaAsset media = new MediaAsset();
        media.setOriginalName("cccd-rep.pdf");
        media.setObjectKey("document/" + UUID.randomUUID() + "-cccd-rep.pdf");
        media.setContentType("application/pdf");
        media.setSize(4096L);
        media.setType(MediaType.DOCUMENT);
        media.setUploadedBy(companyOwner.getUsername());
        media.setStorageProvider("minio");
        media.setConfirmed(true);
        MediaAsset savedMedia = mediaAssets.save(media);

        var idCardDoc =
                providerService.addDocument(
                        new ProviderDocumentCreateRequest(
                                ProviderDocumentType.IDENTITY_CARD,
                                "CCCD người đại diện pháp luật",
                                "001090123456",
                                null,
                                savedMedia.getId()),
                        companyOwner.getUsername());
        assertNotNull(idCardDoc.createdAt());
        assertNotNull(idCardDoc.updatedAt());
        assertEquals(savedMedia.getId(), idCardDoc.mediaAssetId());

        for (ProviderDocumentType type :
                List.of(
                        ProviderDocumentType.BUSINESS_LICENSE,
                        ProviderDocumentType.PILOT_CERTIFICATE,
                        ProviderDocumentType.UAV_REGISTRATION,
                        ProviderDocumentType.INSURANCE_POLICY,
                        ProviderDocumentType.PLATFORM_FEE_AGREEMENT,
                        ProviderDocumentType.TAX_SETTLEMENT_DOSSIER)) {
            providerService.addDocument(
                    new ProviderDocumentCreateRequest(
                            type,
                            "Hồ sơ " + type.name(),
                            "NUM-" + type.name(),
                            "https://docs.example.com/" + type.name().toLowerCase() + ".pdf",
                            null),
                    companyOwner.getUsername());
        }

        // 4. Submit verification via REST endpoint -> transitions DRAFT -> PENDING_REVIEW
        mvc.perform(
                        post(ApiRoutes.Marketplace.PROVIDER_BASE
                                        + ApiRoutes.Marketplace.SUBMIT_VERIFICATION)
                                .with(authentication(authOf(companyOwner)))
                                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("PENDING_REVIEW"))
                .andExpect(jsonPath("$.documents.length()").value(7));

        // 5. Pure Hibernate DAO findByIdAndProviderId enforces provider isolation
        assertTrue(
                providerDocuments
                        .findByIdAndProviderId(idCardDoc.id(), companyProfile.id())
                        .isPresent());
        assertFalse(providerDocuments.findByIdAndProviderId(idCardDoc.id(), -1L).isPresent());

        // 6. Admin inspects all provider documents via GET
        // /api/v1/admin/marketplace/providers/{providerId}/documents
        mvc.perform(
                        get(
                                        ApiRoutes.Marketplace.ADMIN_BASE
                                                + ApiRoutes.Marketplace.ADMIN_PROVIDER_DOCUMENTS,
                                        companyProfile.id())
                                .with(authentication(authOf(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$[0].updatedAt").isNotEmpty());

        // Non-admin cannot access admin document endpoints
        mvc.perform(
                        get(
                                        ApiRoutes.Marketplace.ADMIN_BASE
                                                + ApiRoutes.Marketplace.ADMIN_PROVIDER_DOCUMENTS,
                                        companyProfile.id())
                                .with(authentication(authOf(companyOwner))))
                .andExpect(status().isForbidden());

        // 7. Admin rejects single document via PATCH without note -> 400
        mvc.perform(
                        patch(
                                        ApiRoutes.Marketplace.ADMIN_BASE
                                                + ApiRoutes.Marketplace
                                                        .ADMIN_PROVIDER_DOCUMENT_BY_ID,
                                        companyProfile.id(),
                                        idCardDoc.id())
                                .with(authentication(authOf(admin)))
                                .with(csrf())
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                new ProviderDocumentModerationRequest(
                                                        ProviderDocumentStatus.REJECTED, ""))))
                .andExpect(status().isBadRequest());

        // 8. Admin rejects single document with clear reviewerNote -> 200
        mvc.perform(
                        patch(
                                        ApiRoutes.Marketplace.ADMIN_BASE
                                                + ApiRoutes.Marketplace
                                                        .ADMIN_PROVIDER_DOCUMENT_BY_ID,
                                        companyProfile.id(),
                                        idCardDoc.id())
                                .with(authentication(authOf(admin)))
                                .with(csrf())
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                new ProviderDocumentModerationRequest(
                                                        ProviderDocumentStatus.REJECTED,
                                                        "Ảnh CCCD bị mờ góc phải"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.reviewerNote").value("Ảnh CCCD bị mờ góc phải"));

        // 9. Admin rejects provider profile -> provider cannot resubmit until replacing rejected
        // IDENTITY_CARD
        adminService.moderateProvider(
                companyProfile.id(),
                new ProviderModerationRequest(
                        ProviderVerificationStatus.REJECTED, "Cần bổ sung ảnh CCCD rõ nét", null),
                admin.getUsername());

        SystemException stillMissing =
                assertThrows(
                        SystemException.class,
                        () -> providerService.submitForVerification(companyOwner.getUsername()));
        assertEquals("REQUIRED_DOCUMENTS_MISSING", stillMissing.getCode());
        assertTrue(stillMissing.getMessage().contains("IDENTITY_CARD"));

        // 10. Provider deletes rejected doc, uploads clear replacement, and resubmits
        providerService.deleteDocument(idCardDoc.id(), companyOwner.getUsername());
        var replacement =
                providerService.addDocument(
                        new ProviderDocumentCreateRequest(
                                ProviderDocumentType.IDENTITY_CARD,
                                "CCCD rõ nét bản mới",
                                "001090123456",
                                "https://docs.example.com/cccd-v2.pdf",
                                null),
                        companyOwner.getUsername());
        assertEquals(ProviderDocumentStatus.PENDING, replacement.status());

        // Resubmit transitions REJECTED -> PENDING_REVIEW
        var resubmitted = providerService.submitForVerification(companyOwner.getUsername());
        assertEquals(ProviderVerificationStatus.PENDING_REVIEW, resubmitted.verificationStatus());

        // 11. Admin approves replacement doc individually -> cannot be deleted once APPROVED
        mvc.perform(
                        patch(
                                        ApiRoutes.Marketplace.ADMIN_BASE
                                                + ApiRoutes.Marketplace
                                                        .ADMIN_PROVIDER_DOCUMENT_BY_ID,
                                        companyProfile.id(),
                                        replacement.id())
                                .with(authentication(authOf(admin)))
                                .with(csrf())
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(
                                                new ProviderDocumentModerationRequest(
                                                        ProviderDocumentStatus.APPROVED,
                                                        "Đã đối chiếu bản gốc"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        SystemException lockedErr =
                assertThrows(
                        SystemException.class,
                        () ->
                                providerService.deleteDocument(
                                        replacement.id(), companyOwner.getUsername()));
        assertEquals("DOCUMENT_LOCKED", lockedErr.getCode());

        // 12. Admin verifies profile -> subsequent submitForVerification returns
        // PROVIDER_ALREADY_VERIFIED
        adminService.moderateProvider(
                companyProfile.id(),
                new ProviderModerationRequest(
                        ProviderVerificationStatus.VERIFIED, "Đạt chuẩn KYC", null),
                admin.getUsername());
        SystemException alreadyVerified =
                assertThrows(
                        SystemException.class,
                        () -> providerService.submitForVerification(companyOwner.getUsername()));
        assertEquals("PROVIDER_ALREADY_VERIFIED", alreadyVerified.getCode());

        // 13. Admin suspends profile -> addDocument / deleteDocument / submitForVerification
        // blocked
        adminService.moderateProvider(
                companyProfile.id(),
                new ProviderModerationRequest(
                        ProviderVerificationStatus.SUSPENDED, "Tạm khoá kiểm tra", null),
                admin.getUsername());
        SystemException suspendedErr =
                assertThrows(
                        SystemException.class,
                        () ->
                                providerService.addDocument(
                                        new ProviderDocumentCreateRequest(
                                                ProviderDocumentType.FLIGHT_OPERATION_PERMIT,
                                                "Phép bay",
                                                "FP-01",
                                                "https://docs.example.com/fp.pdf",
                                                null),
                                        companyOwner.getUsername()));
        assertEquals("PROVIDER_SUSPENDED", suspendedErr.getCode());

        // 14. Individual provider only requires 5 mandatory docs (no BUSINESS_LICENSE /
        // TAX_SETTLEMENT_DOSSIER)
        providerService.upsertMyProfile(
                new ProviderOnboardingRequest(
                        "Phi công Độc lập A",
                        ProviderType.INDIVIDUAL,
                        "079091000111",
                        "CAAV-IND-01",
                        "Phi công cá nhân",
                        "Đà Nẵng",
                        80,
                        "0912333444",
                        "ACB",
                        "99887766",
                        "NGUYEN VAN A",
                        false),
                individualOwner.getUsername());
        for (ProviderDocumentType type :
                List.of(
                        ProviderDocumentType.IDENTITY_CARD,
                        ProviderDocumentType.PILOT_CERTIFICATE,
                        ProviderDocumentType.UAV_REGISTRATION,
                        ProviderDocumentType.INSURANCE_POLICY,
                        ProviderDocumentType.PLATFORM_FEE_AGREEMENT)) {
            providerService.addDocument(
                    new ProviderDocumentCreateRequest(
                            type,
                            "Hồ sơ cá nhân " + type.name(),
                            "IND-" + type.name(),
                            "https://docs.example.com/ind/" + type.name().toLowerCase() + ".pdf",
                            null),
                    individualOwner.getUsername());
        }
        var indivSubmitted = providerService.submitForVerification(individualOwner.getUsername());
        assertEquals(
                ProviderVerificationStatus.PENDING_REVIEW, indivSubmitted.verificationStatus());
    }

    private AppUser createUser(String username, UserRole role) {
        AppUser u = new AppUser();
        u.setUsername(username);
        u.setEmail(username + "@example.com");
        u.setFullName(username);
        u.setPasswordHash("bcrypt-placeholder");
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        u.setEmailVerified(true);
        return users.save(u);
    }

    private UsernamePasswordAuthenticationToken authOf(AppUser user) {
        return UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(),
                "n/a",
                List.of(new SimpleGrantedAuthority(user.getRole().name())));
    }

    private static String suffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }
}
