package com.uav.platform.config.i18n;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.entity.i18n.UiTranslation;
import com.uav.platform.repository.i18n.UiTranslationRepository;
import com.uav.platform.service.i18n.UiTranslationService;
import com.uav.platform.service.impl.i18n.UiTranslationServiceImpl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Seeds all bundled trilingual dictionaries (classpath:i18n/{vi,en,ja}.json) into PostgreSQL
 * `ui_translations` idempotently so every UI string lives in the database and can be modified via
 * `/api/v1/admin/i18n` without losing Admin edits across restarts.
 */
@Slf4j
@Component
@ConditionalOnProperty(
        name = "app.i18n.seed-on-startup",
        havingValue = "true",
        matchIfMissing = true)
@RequiredArgsConstructor
public class UiTranslationDataInitializer implements ApplicationRunner {

    private static final List<String> LOCALES = List.of("vi", "en", "ja");

    private final UiTranslationRepository repository;
    private final UiTranslationService translationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int inserted = 0;
        for (String locale : LOCALES) {
            ClassPathResource resource = new ClassPathResource("i18n/" + locale + ".json");
            if (!resource.exists()) continue;
            try (InputStream in = resource.getInputStream()) {
                Map<String, Object> tree =
                        objectMapper.readValue(in, new TypeReference<Map<String, Object>>() {});
                Map<String, String> flattened = new LinkedHashMap<>();
                flatten("", tree, flattened);
                if (flattened.isEmpty()) continue;

                Set<String> existingKeys = new HashSet<>();
                for (UiTranslation row : repository.findByLocaleOrderByTranslationKeyAsc(locale)) {
                    existingKeys.add(row.getTranslationKey());
                }

                List<UiTranslation> toSave = new ArrayList<>();
                for (Map.Entry<String, String> entry : flattened.entrySet()) {
                    if (existingKeys.contains(entry.getKey()) || entry.getValue() == null) continue;
                    UiTranslation entity = new UiTranslation();
                    entity.setLocale(locale);
                    entity.setTranslationKey(entry.getKey());
                    entity.setNamespace(
                            UiTranslationServiceImpl.inferNamespace(entry.getKey(), null));
                    entity.setMessageText(entry.getValue());
                    entity.setUpdatedBy("SYSTEM");
                    toSave.add(entity);
                }
                if (!toSave.isEmpty()) {
                    repository.saveAll(toSave);
                    inserted += toSave.size();
                }
            } catch (Exception ex) {
                log.warn("Could not seed i18n bundle for locale {}: {}", locale, ex.getMessage());
            }
        }
        if (inserted > 0) {
            translationService.invalidateCache();
            log.info("Seeded {} new UI translation rows into PostgreSQL ui_translations", inserted);
        }
    }

    @SuppressWarnings("unchecked")
    private static void flatten(String prefix, Map<String, Object> node, Map<String, String> out) {
        for (Map.Entry<String, Object> entry : node.entrySet()) {
            String key = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
            Object val = entry.getValue();
            if (val instanceof Map<?, ?> child) {
                flatten(key, (Map<String, Object>) child, out);
            } else if (val instanceof String text) {
                out.put(key, text);
            }
        }
    }
}
