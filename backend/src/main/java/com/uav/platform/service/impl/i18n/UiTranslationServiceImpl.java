package com.uav.platform.service.impl.i18n;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.i18n.UpsertUiTranslationRequest;
import com.uav.platform.dto.response.i18n.PublicLocaleBundleResponse;
import com.uav.platform.dto.response.i18n.UiTranslationRowResponse;
import com.uav.platform.entity.i18n.UiTranslation;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.i18n.UiTranslationRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.i18n.UiTranslationService;
import com.uav.platform.specification.i18n.UiTranslationSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
public class UiTranslationServiceImpl implements UiTranslationService {

    private static final List<String> SUPPORTED_LOCALES = List.of("vi", "en", "ja");
    private static final Set<String> VALID_LOCALE_SET = Set.of("vi", "en", "ja");

    private final UiTranslationRepository repository;
    private final AuditLogService auditLogService;

    private final Map<String, PublicLocaleBundleResponse> bundleCache = new ConcurrentHashMap<>();
    private final AtomicLong revisionCounter = new AtomicLong(System.currentTimeMillis());

    public static String normalizeLocaleCode(String raw) {
        if (!StringUtils.hasText(raw)) return "vi";
        String lower = raw.trim().toLowerCase(Locale.ROOT);
        if (lower.startsWith("en")) return "en";
        if (lower.startsWith("ja") || lower.startsWith("jp")) return "ja";
        return "vi";
    }

    public static String inferNamespace(String key, String explicitNamespace) {
        if (StringUtils.hasText(explicitNamespace)) return explicitNamespace.trim();
        int dot = key.indexOf('.');
        return dot > 0 ? key.substring(0, dot) : "common";
    }

    @Override
    @Transactional(readOnly = true)
    public PublicLocaleBundleResponse getPublicBundle(String locale, String namespace) {
        String canonical = normalizeLocaleCode(locale);
        String ns = StringUtils.hasText(namespace) ? namespace.trim() : "";
        String cacheKey = canonical + "::" + ns;
        PublicLocaleBundleResponse cached = bundleCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        List<UiTranslation> rows =
                ns.isEmpty()
                        ? repository.findByLocaleOrderByTranslationKeyAsc(canonical)
                        : repository.findByLocaleAndNamespaceOrderByTranslationKeyAsc(
                                canonical, ns);
        Map<String, String> flat = new LinkedHashMap<>();
        Map<String, Object> nested = new LinkedHashMap<>();
        for (UiTranslation row : rows) {
            if (!StringUtils.hasText(row.getTranslationKey()) || row.getMessageText() == null) {
                continue;
            }
            flat.put(row.getTranslationKey(), row.getMessageText());
            putNested(nested, row.getTranslationKey(), row.getMessageText());
        }
        PublicLocaleBundleResponse built =
                new PublicLocaleBundleResponse(
                        canonical,
                        SUPPORTED_LOCALES,
                        flat.size(),
                        revisionCounter.get(),
                        nested,
                        flat);
        bundleCache.put(cacheKey, built);
        return built;
    }

    @SuppressWarnings("unchecked")
    private static void putNested(Map<String, Object> root, String dottedKey, String value) {
        String[] parts = dottedKey.split("\\.");
        Map<String, Object> cursor = root;
        for (int i = 0; i < parts.length - 1; i++) {
            String segment = parts[i];
            Object existing = cursor.get(segment);
            if (existing instanceof Map<?, ?> mapVal) {
                cursor = (Map<String, Object>) mapVal;
            } else {
                Map<String, Object> child = new LinkedHashMap<>();
                cursor.put(segment, child);
                cursor = child;
            }
        }
        cursor.put(parts[parts.length - 1], value);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UiTranslationRowResponse> searchGrouped(
            String namespace, String keyword, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        List<UiTranslation> matched =
                repository.findAll(
                        UiTranslationSpecifications.filter(null, namespace, keyword),
                        Sort.by(Sort.Direction.ASC, "translationKey"));
        List<String> distinctKeys =
                matched.stream().map(UiTranslation::getTranslationKey).distinct().toList();
        int total = distinctKeys.size();
        int fromIndex = Math.min(safePage * safeSize, total);
        int toIndex = Math.min(fromIndex + safeSize, total);
        List<String> pageKeys = distinctKeys.subList(fromIndex, toIndex);

        List<UiTranslationRowResponse> content = new ArrayList<>();
        if (!pageKeys.isEmpty()) {
            List<UiTranslation> allLocales = repository.findByTranslationKeyIn(pageKeys);
            Map<String, List<UiTranslation>> byKey = new LinkedHashMap<>();
            for (String k : pageKeys) {
                byKey.put(k, new ArrayList<>());
            }
            for (UiTranslation row : allLocales) {
                List<UiTranslation> bucket = byKey.get(row.getTranslationKey());
                if (bucket != null) bucket.add(row);
            }
            for (Map.Entry<String, List<UiTranslation>> entry : byKey.entrySet()) {
                content.add(toGroupedResponse(entry.getKey(), entry.getValue()));
            }
        }
        return PageResponse.from(
                new PageImpl<>(content, PageRequest.of(safePage, safeSize), total));
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> listNamespaces() {
        return repository.findDistinctNamespaces();
    }

    @Override
    @Transactional
    public UiTranslationRowResponse upsertGroup(
            UpsertUiTranslationRequest request, Authentication authentication) {
        String key = request.translationKey().trim();
        String ns = inferNamespace(key, request.namespace());
        String actor =
                authentication != null && StringUtils.hasText(authentication.getName())
                        ? authentication.getName()
                        : "ADMIN";
        Map<String, String> map =
                request.translations() != null ? request.translations() : Map.of();
        for (Map.Entry<String, String> entry : map.entrySet()) {
            String locale = normalizeLocaleCode(entry.getKey());
            if (!VALID_LOCALE_SET.contains(locale) || entry.getValue() == null) continue;
            UiTranslation entity =
                    repository
                            .findByTranslationKeyAndLocale(key, locale)
                            .orElseGet(UiTranslation::new);
            entity.setTranslationKey(key);
            entity.setLocale(locale);
            entity.setNamespace(ns);
            if (request.description() != null) {
                entity.setDescription(request.description().trim());
            }
            entity.setMessageText(entry.getValue());
            entity.setUpdatedBy(actor);
            repository.save(entity);
        }
        invalidateCache();
        if (auditLogService != null) {
            auditLogService.record(
                    null, actor, AuditAction.UPDATE, "UI_TRANSLATION", key, "TRANSLATION_UPSERTED");
        }
        List<UiTranslation> updated = repository.findByTranslationKeyIn(List.of(key));
        return toGroupedResponse(key, updated);
    }

    @Override
    @Transactional
    public void deleteByIdOrKey(Long id, String translationKey, Authentication authentication) {
        String actor =
                authentication != null && StringUtils.hasText(authentication.getName())
                        ? authentication.getName()
                        : "ADMIN";
        if (StringUtils.hasText(translationKey)) {
            List<UiTranslation> items =
                    repository.findByTranslationKeyIn(List.of(translationKey.trim()));
            if (items.isEmpty()) {
                throw SystemException.notFound("Translation key not found");
            }
            repository.deleteAll(items);
            invalidateCache();
            if (auditLogService != null) {
                auditLogService.record(
                        null,
                        actor,
                        AuditAction.DELETE,
                        "UI_TRANSLATION",
                        translationKey.trim(),
                        "TRANSLATION_DELETED");
            }
            return;
        }
        if (id != null) {
            UiTranslation item =
                    repository
                            .findById(id)
                            .orElseThrow(() -> SystemException.notFound("Translation not found"));
            String key = item.getTranslationKey();
            List<UiTranslation> siblings = repository.findByTranslationKeyIn(List.of(key));
            repository.deleteAll(siblings);
            invalidateCache();
            if (auditLogService != null) {
                auditLogService.record(
                        null,
                        actor,
                        AuditAction.DELETE,
                        "UI_TRANSLATION",
                        key,
                        "TRANSLATION_DELETED");
            }
        }
    }

    @Override
    public void invalidateCache() {
        bundleCache.clear();
        revisionCounter.incrementAndGet();
    }

    private static UiTranslationRowResponse toGroupedResponse(
            String key, List<UiTranslation> items) {
        Long representativeId = null;
        String namespace = inferNamespace(key, null);
        String description = null;
        String vi = "";
        String en = "";
        String ja = "";
        String updatedBy = "SYSTEM";
        LocalDateTime latest = null;
        for (UiTranslation row : items) {
            if (representativeId == null) representativeId = row.getId();
            if (StringUtils.hasText(row.getNamespace())) namespace = row.getNamespace();
            if (StringUtils.hasText(row.getDescription())) description = row.getDescription();
            if ("vi".equals(row.getLocale())) vi = row.getMessageText();
            else if ("en".equals(row.getLocale())) en = row.getMessageText();
            else if ("ja".equals(row.getLocale())) ja = row.getMessageText();
            if (row.getUpdatedAt() != null
                    && (latest == null || row.getUpdatedAt().isAfter(latest))) {
                latest = row.getUpdatedAt();
                if (StringUtils.hasText(row.getUpdatedBy())) updatedBy = row.getUpdatedBy();
            }
        }
        return new UiTranslationRowResponse(
                representativeId, namespace, key, description, vi, en, ja, updatedBy, latest);
    }
}
