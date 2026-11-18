package com.uav.platform.repository.i18n;

import com.uav.platform.entity.i18n.UiTranslation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UiTranslationRepository
        extends JpaRepository<UiTranslation, Long>, JpaSpecificationExecutor<UiTranslation> {

    List<UiTranslation> findByLocaleOrderByTranslationKeyAsc(String locale);

    List<UiTranslation> findByLocaleAndNamespaceOrderByTranslationKeyAsc(
            String locale, String namespace);

    List<UiTranslation> findByTranslationKeyIn(List<String> keys);

    Optional<UiTranslation> findByTranslationKeyAndLocale(String translationKey, String locale);

    @Query("SELECT DISTINCT t.namespace FROM UiTranslation t ORDER BY t.namespace ASC")
    List<String> findDistinctNamespaces();
}
