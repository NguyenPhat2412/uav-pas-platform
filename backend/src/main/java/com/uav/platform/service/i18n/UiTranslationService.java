package com.uav.platform.service.i18n;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.i18n.UpsertUiTranslationRequest;
import com.uav.platform.dto.response.i18n.PublicLocaleBundleResponse;
import com.uav.platform.dto.response.i18n.UiTranslationRowResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

public interface UiTranslationService {

    PublicLocaleBundleResponse getPublicBundle(String locale, String namespace);

    PageResponse<UiTranslationRowResponse> searchGrouped(
            String namespace, String keyword, int page, int size);

    List<String> listNamespaces();

    UiTranslationRowResponse upsertGroup(
            UpsertUiTranslationRequest request, Authentication authentication);

    void deleteByIdOrKey(Long id, String translationKey, Authentication authentication);

    void invalidateCache();
}
