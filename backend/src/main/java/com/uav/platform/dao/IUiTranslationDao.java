package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.UiTranslation;

import java.util.List;
import java.util.Optional;

public interface IUiTranslationDao extends IGenericDao<Long, UiTranslation> {
    List<UiTranslation> findByLocaleOrderByTranslationKeyAsc(String locale);

    List<UiTranslation> findByLocaleAndNamespaceOrderByTranslationKeyAsc(
            String locale, String namespace);

    List<UiTranslation> findByTranslationKeyIn(List<String> keys);

    Optional<UiTranslation> findByTranslationKeyAndLocale(String translationKey, String locale);

    List<String> findDistinctNamespaces();
}
