package com.uav.platform.service.i18n;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.i18n.IUiTranslationDao;
import com.uav.platform.dto.request.i18n.UpsertUiTranslationRequest;
import com.uav.platform.dto.response.i18n.PublicLocaleBundleResponse;
import com.uav.platform.dto.response.i18n.UiTranslationRowResponse;
import com.uav.platform.entity.i18n.UiTranslation;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.i18n.UiTranslationServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

class UiTranslationServiceTest {

    private IUiTranslationDao repository;
    private AuditLogService auditLogService;
    private UiTranslationServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(IUiTranslationDao.class);
        auditLogService = mock(AuditLogService.class);
        service = new UiTranslationServiceImpl(repository, auditLogService);
    }

    @Test
    void normalizeLocaleCodeMapsSupportedLocalesCleanly() {
        assertThat(UiTranslationServiceImpl.normalizeLocaleCode(null)).isEqualTo("vi");
        assertThat(UiTranslationServiceImpl.normalizeLocaleCode("  ")).isEqualTo("vi");
        assertThat(UiTranslationServiceImpl.normalizeLocaleCode("en-US")).isEqualTo("en");
        assertThat(UiTranslationServiceImpl.normalizeLocaleCode("JA_JP")).isEqualTo("ja");
        assertThat(UiTranslationServiceImpl.normalizeLocaleCode("jp")).isEqualTo("ja");
        assertThat(UiTranslationServiceImpl.normalizeLocaleCode("fr")).isEqualTo("vi");
    }

    @Test
    @SuppressWarnings("unchecked")
    void getPublicBundleBuildsNestedAndFlatCatalogAndCachesUntilUpsert() {
        UiTranslation row = new UiTranslation();
        row.setId(1L);
        row.setLocale("ja");
        row.setNamespace("publicSite");
        row.setTranslationKey("publicSite.hero.primaryCta");
        row.setMessageText("プロバイダーを探して依頼する");

        when(repository.findByLocaleOrderByTranslationKeyAsc("ja")).thenReturn(List.of(row));

        PublicLocaleBundleResponse first = service.getPublicBundle("ja-JP", null);
        PublicLocaleBundleResponse second = service.getPublicBundle("ja", "");

        assertThat(first.locale()).isEqualTo("ja");
        assertThat(first.totalKeys()).isEqualTo(1);
        assertThat(first.flat()).containsEntry("publicSite.hero.primaryCta", "プロバイダーを探して依頼する");
        Map<String, Object> publicSiteNode =
                (Map<String, Object>) first.messages().get("publicSite");
        Map<String, Object> heroNode = (Map<String, Object>) publicSiteNode.get("hero");
        assertThat(heroNode).containsEntry("primaryCta", "プロバイダーを探して依頼する");
        assertThat(second).isSameAs(first);
        verify(repository, times(1)).findByLocaleOrderByTranslationKeyAsc("ja");

        when(repository.findByTranslationKeyAndLocale(eq("publicSite.hero.primaryCta"), any()))
                .thenReturn(Optional.empty());
        when(repository.findByTranslationKeyIn(List.of("publicSite.hero.primaryCta")))
                .thenReturn(List.of(row));

        UiTranslationRowResponse upserted =
                service.upsertGroup(
                        new UpsertUiTranslationRequest(
                                "publicSite.hero.primaryCta",
                                "publicSite",
                                "Hero CTA",
                                Map.of(
                                        "vi", "Tìm & Thuê Nhà cung cấp",
                                        "en", "Find & Hire a Provider",
                                        "ja", "プロバイダーを探して依頼する")),
                        new UsernamePasswordAuthenticationToken("admin_user", "N/A"));

        assertThat(upserted.namespace()).isEqualTo("publicSite");
        verify(repository, times(3)).save(any(UiTranslation.class));

        PublicLocaleBundleResponse afterInvalidate = service.getPublicBundle("ja", null);
        assertThat(afterInvalidate.revision()).isGreaterThan(first.revision());
        verify(repository, times(2)).findByLocaleOrderByTranslationKeyAsc("ja");
    }

    @Test
    @SuppressWarnings("unchecked")
    void searchGroupedCombinesAllThreeLocalesPerTranslationKey() {
        UiTranslation vi = new UiTranslation();
        vi.setId(10L);
        vi.setLocale("vi");
        vi.setNamespace("publicSite");
        vi.setTranslationKey("publicSite.header.marketplace");
        vi.setMessageText("Sàn dịch vụ UAV");
        vi.setUpdatedBy("SYSTEM");
        vi.setUpdatedAt(LocalDateTime.now());

        UiTranslation en = new UiTranslation();
        en.setId(11L);
        en.setLocale("en");
        en.setNamespace("publicSite");
        en.setTranslationKey("publicSite.header.marketplace");
        en.setMessageText("UAV Marketplace");

        UiTranslation ja = new UiTranslation();
        ja.setId(12L);
        ja.setLocale("ja");
        ja.setNamespace("publicSite");
        ja.setTranslationKey("publicSite.header.marketplace");
        ja.setMessageText("UAVマーケットプレイス");

        when(repository.findAll(any(HibernateSpecification.class), any(Sort.class)))
                .thenReturn(List.of(vi, en, ja));
        when(repository.findByTranslationKeyIn(anyList())).thenReturn(List.of(vi, en, ja));

        PageResponse<UiTranslationRowResponse> page =
                service.searchGrouped("publicSite", "marketplace", 0, 20);

        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(page.content()).hasSize(1);
        UiTranslationRowResponse grouped = page.content().get(0);
        assertThat(grouped.translationKey()).isEqualTo("publicSite.header.marketplace");
        assertThat(grouped.vi()).isEqualTo("Sàn dịch vụ UAV");
        assertThat(grouped.en()).isEqualTo("UAV Marketplace");
        assertThat(grouped.ja()).isEqualTo("UAVマーケットプレイス");
    }
}
