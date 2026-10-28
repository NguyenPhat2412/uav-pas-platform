package com.uav.platform.modules.training.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.training.dto.request.UpdateTrainingProgressRequest;
import com.uav.platform.modules.training.dto.request.UpsertTrainingDocumentRequest;
import com.uav.platform.modules.training.dto.response.TrainingDocumentResponse;
import com.uav.platform.modules.training.dto.response.TrainingOverviewResponse;
import com.uav.platform.modules.training.entity.TrainingDocument;
import com.uav.platform.modules.training.entity.UserTrainingProgress;
import com.uav.platform.modules.training.repository.TrainingDocumentRepository;
import com.uav.platform.modules.training.repository.UserTrainingProgressRepository;
import com.uav.platform.modules.training.service.TrainingService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.security.AuthCookieHelper;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrainingServiceImpl implements TrainingService {

    private static final Set<String> VALID_PORTALS = Set.of("CUSTOMER", "OPERATIONS", "ADMIN");

    private final TrainingDocumentRepository trainingDocumentRepository;
    private final UserTrainingProgressRepository userTrainingProgressRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(readOnly = true)
    public TrainingOverviewResponse getOverview(
            String portal, String category, String search, Authentication authentication) {
        AppUser user = resolveUser(authentication);
        Long userId = user != null ? user.getId() : null;
        // A caller only sees documents for portals their role may use; anything else falls back to
        // their own.
        String requested = normalizePortal(portal);
        String resolvedPortal =
                portalsFor(user).contains(requested) ? requested : defaultPortal(user);

        List<TrainingDocument> allDocs =
                trainingDocumentRepository.findByTargetPortalAndActiveTrueOrderBySortOrderAscIdAsc(
                        resolvedPortal);

        Map<Long, UserTrainingProgress> progressByDocId = loadProgressMap(userId);

        int totalDocs = allDocs.size();
        int completedDocs = 0;
        int mandatoryDocs = 0;
        int mandatoryCompleted = 0;
        int totalMinutes = 0;
        int completedMinutes = 0;

        for (TrainingDocument doc : allDocs) {
            UserTrainingProgress progress = progressByDocId.get(doc.getId());
            boolean isCompleted = progress != null && "COMPLETED".equals(progress.getStatus());
            boolean isMandatory = Boolean.TRUE.equals(doc.getIsMandatory());
            int estMinutes = doc.getEstimatedMinutes() != null ? doc.getEstimatedMinutes() : 10;

            totalMinutes += estMinutes;
            if (isCompleted) {
                completedDocs++;
                completedMinutes += estMinutes;
            }
            if (isMandatory) {
                mandatoryDocs++;
                if (isCompleted) {
                    mandatoryCompleted++;
                }
            }
        }

        String normalizedCategory =
                StringUtils.hasText(category) && !"ALL".equalsIgnoreCase(category.trim())
                        ? category.trim().toUpperCase(Locale.ROOT)
                        : null;
        String normalizedSearch =
                StringUtils.hasText(search) ? search.trim().toLowerCase(Locale.ROOT) : null;

        List<TrainingDocumentResponse> filteredDtos =
                allDocs.stream()
                        .filter(
                                doc ->
                                        normalizedCategory == null
                                                || normalizedCategory.equalsIgnoreCase(
                                                        doc.getCategory()))
                        .filter(doc -> matchesSearch(doc, normalizedSearch))
                        .map(doc -> toResponse(doc, progressByDocId.get(doc.getId())))
                        .collect(Collectors.toList());

        return TrainingOverviewResponse.builder()
                .portal(resolvedPortal)
                .totalDocuments(totalDocs)
                .completedDocuments(completedDocs)
                .mandatoryDocuments(mandatoryDocs)
                .mandatoryCompleted(mandatoryCompleted)
                .totalEstimatedMinutes(totalMinutes)
                .completedMinutes(completedMinutes)
                .documents(filteredDtos)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TrainingDocumentResponse getByCodeOrSlug(
            String codeOrSlug, Authentication authentication) {
        if (!StringUtils.hasText(codeOrSlug)) {
            throw SystemException.badRequest("Training document code or slug is required");
        }
        String key = codeOrSlug.trim();
        TrainingDocument doc =
                trainingDocumentRepository
                        .findByCodeIgnoreCaseOrSlugIgnoreCase(key, key)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Training document not found: " + key));

        AppUser user = resolveUser(authentication);
        requireReadable(doc, user);
        UserTrainingProgress progress =
                user != null
                        ? userTrainingProgressRepository
                                .findByUserIdAndDocumentId(user.getId(), doc.getId())
                                .orElse(null)
                        : null;
        return toResponse(doc, progress);
    }

    @Override
    @Transactional
    public TrainingDocumentResponse updateProgress(
            Long documentId, UpdateTrainingProgressRequest request, Authentication authentication) {
        AppUser user = resolveUserRequired(authentication);
        TrainingDocument doc =
                trainingDocumentRepository
                        .findById(documentId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Training document not found: " + documentId));
        requireReadable(doc, user);

        List<String> totalChecklist = parseStringList(doc.getChecklistJson());
        List<Integer> rawSteps =
                request != null && request.getCheckedSteps() != null
                        ? request.getCheckedSteps()
                        : Collections.emptyList();

        Set<Integer> sanitizedSteps = new LinkedHashSet<>();
        for (Integer idx : rawSteps) {
            if (idx != null && idx >= 0 && idx < totalChecklist.size()) {
                sanitizedSteps.add(idx);
            }
        }
        List<Integer> checkedSteps = new ArrayList<>(sanitizedSteps);
        Collections.sort(checkedSteps);

        boolean allStepsChecked =
                !totalChecklist.isEmpty() && checkedSteps.size() >= totalChecklist.size();
        // Documents with a checklist are completed by ticking every step; only checklist-free ones
        // can be marked done.
        boolean forceCompleted =
                totalChecklist.isEmpty()
                        && request != null
                        && Boolean.TRUE.equals(request.getMarkCompleted());

        String status;
        if (forceCompleted || allStepsChecked) {
            status = "COMPLETED";
        } else if (!checkedSteps.isEmpty()) {
            status = "IN_PROGRESS";
        } else {
            status = "NOT_STARTED";
        }

        UserTrainingProgress progress =
                userTrainingProgressRepository
                        .findByUserIdAndDocumentId(user.getId(), doc.getId())
                        .orElseGet(
                                () -> {
                                    UserTrainingProgress created = new UserTrainingProgress();
                                    created.setUser(user);
                                    created.setDocument(doc);
                                    return created;
                                });

        progress.setStatus(status);
        progress.setCheckedStepsJson(writeJson(checkedSteps));
        progress.setLastViewedAt(OffsetDateTime.now());
        if ("COMPLETED".equals(status)) {
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(OffsetDateTime.now());
            }
        } else {
            progress.setCompletedAt(null);
        }

        UserTrainingProgress saved = userTrainingProgressRepository.save(progress);
        return toResponse(doc, saved);
    }

    @Override
    @Transactional
    public TrainingDocumentResponse createDocument(
            UpsertTrainingDocumentRequest request, Authentication authentication) {
        String normalizedCode = request.getCode().trim().toUpperCase(Locale.ROOT);
        trainingDocumentRepository
                .findByCodeIgnoreCase(normalizedCode)
                .ifPresent(
                        existing -> {
                            throw SystemException.badRequest(
                                    "Training document code already exists: " + normalizedCode);
                        });

        String targetPortal = normalizePortal(request.getTargetPortal());
        String slug = buildUniqueSlug(normalizedCode, request.getTitle(), null);

        TrainingDocument doc = new TrainingDocument();
        doc.setCode(normalizedCode);
        doc.setSlug(slug);
        doc.setTargetPortal(targetPortal);
        doc.setCategory(request.getCategory().trim().toUpperCase(Locale.ROOT));
        doc.setLevel(request.getLevel().trim().toUpperCase(Locale.ROOT));
        doc.setVersionTag(
                StringUtils.hasText(request.getVersionTag())
                        ? request.getVersionTag().trim()
                        : "SOP-2026.1");
        doc.setEstimatedMinutes(
                request.getEstimatedMinutes() != null
                        ? Math.max(1, request.getEstimatedMinutes())
                        : 10);
        doc.setIsMandatory(Boolean.TRUE.equals(request.getIsMandatory()));
        doc.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 10);
        doc.setActive(request.getActive() == null || Boolean.TRUE.equals(request.getActive()));
        doc.setTitle(request.getTitle().trim());
        doc.setSummary(request.getSummary().trim());
        doc.setContentMarkdown(request.getContentMarkdown().trim());
        doc.setChecklistJson(
                writeJson(
                        request.getChecklistSteps() != null
                                ? request.getChecklistSteps()
                                : Collections.emptyList()));

        TrainingDocument saved = trainingDocumentRepository.save(doc);
        return toResponse(saved, null);
    }

    @Override
    @Transactional
    public TrainingDocumentResponse updateDocument(
            Long id, UpsertTrainingDocumentRequest request, Authentication authentication) {
        TrainingDocument doc =
                trainingDocumentRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Training document not found: " + id));

        String normalizedCode = request.getCode().trim().toUpperCase(Locale.ROOT);
        trainingDocumentRepository
                .findByCodeIgnoreCase(normalizedCode)
                .ifPresent(
                        existing -> {
                            if (!existing.getId().equals(id)) {
                                throw SystemException.badRequest(
                                        "Training document code already exists: " + normalizedCode);
                            }
                        });

        doc.setCode(normalizedCode);
        doc.setSlug(buildUniqueSlug(normalizedCode, request.getTitle(), id));
        doc.setTargetPortal(normalizePortal(request.getTargetPortal()));
        doc.setCategory(request.getCategory().trim().toUpperCase(Locale.ROOT));
        doc.setLevel(request.getLevel().trim().toUpperCase(Locale.ROOT));
        if (StringUtils.hasText(request.getVersionTag())) {
            doc.setVersionTag(request.getVersionTag().trim());
        }
        doc.setEstimatedMinutes(
                request.getEstimatedMinutes() != null
                        ? Math.max(1, request.getEstimatedMinutes())
                        : doc.getEstimatedMinutes());
        if (request.getIsMandatory() != null) {
            doc.setIsMandatory(request.getIsMandatory());
        }
        if (request.getSortOrder() != null) {
            doc.setSortOrder(request.getSortOrder());
        }
        if (request.getActive() != null) {
            doc.setActive(request.getActive());
        }
        doc.setTitle(request.getTitle().trim());
        doc.setSummary(request.getSummary().trim());
        doc.setContentMarkdown(request.getContentMarkdown().trim());
        if (request.getChecklistSteps() != null) {
            doc.setChecklistJson(writeJson(request.getChecklistSteps()));
        }

        TrainingDocument saved = trainingDocumentRepository.save(doc);
        AppUser user = resolveUser(authentication);
        UserTrainingProgress progress =
                user != null
                        ? userTrainingProgressRepository
                                .findByUserIdAndDocumentId(user.getId(), saved.getId())
                                .orElse(null)
                        : null;
        return toResponse(saved, progress);
    }

    /** Portals a role may read training for; mirrors the frontend portal guards. */
    static Set<String> portalsFor(AppUser user) {
        UserRole role = user == null ? null : user.getRole();
        if (role == UserRole.ROLE_ADMIN) return VALID_PORTALS;
        if (role == UserRole.ROLE_COMMANDER || role == UserRole.ROLE_OPERATOR)
            return Set.of("OPERATIONS", "CUSTOMER");
        return Set.of("CUSTOMER");
    }

    static String defaultPortal(AppUser user) {
        UserRole role = user == null ? null : user.getRole();
        if (role == UserRole.ROLE_ADMIN) return "ADMIN";
        if (role == UserRole.ROLE_COMMANDER || role == UserRole.ROLE_OPERATOR) return "OPERATIONS";
        return "CUSTOMER";
    }

    /**
     * Hidden documents and documents for a portal the caller may not use answer 404, so their codes are not
     * confirmed to exist. Administrators can still open inactive drafts.
     */
    private void requireReadable(TrainingDocument doc, AppUser user) {
        boolean admin = user != null && user.getRole() == UserRole.ROLE_ADMIN;
        boolean visible = admin || Boolean.TRUE.equals(doc.getActive());
        if (!visible || !portalsFor(user).contains(doc.getTargetPortal()))
            throw SystemException.notFound("Training document not found");
    }

    private String normalizePortal(String portal) {
        if (!StringUtils.hasText(portal)) {
            return "CUSTOMER";
        }
        String candidate = portal.trim().toUpperCase(Locale.ROOT);
        return VALID_PORTALS.contains(candidate) ? candidate : "CUSTOMER";
    }

    private boolean matchesSearch(TrainingDocument doc, String searchLower) {
        if (searchLower == null) {
            return true;
        }
        return containsLower(doc.getCode(), searchLower)
                || containsLower(doc.getTitle(), searchLower)
                || containsLower(doc.getSummary(), searchLower)
                || containsLower(doc.getCategory(), searchLower)
                || containsLower(doc.getVersionTag(), searchLower);
    }

    private boolean containsLower(String value, String searchLower) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(searchLower);
    }

    private Map<Long, UserTrainingProgress> loadProgressMap(Long userId) {
        if (userId == null) {
            return Collections.emptyMap();
        }
        List<UserTrainingProgress> list = userTrainingProgressRepository.findByUserId(userId);
        Map<Long, UserTrainingProgress> map = new HashMap<>();
        for (UserTrainingProgress item : list) {
            if (item.getDocument() != null && item.getDocument().getId() != null) {
                map.put(item.getDocument().getId(), item);
            }
        }
        return map;
    }

    private AppUser resolveUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String username = authentication.getName();
        if (!StringUtils.hasText(username)) {
            return null;
        }
        return userRepository
                .findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElse(null);
    }

    private AppUser resolveUserRequired(Authentication authentication) {
        String username = AuthCookieHelper.requireAuthenticatedUsername(authentication);
        return userRepository
                .findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> SystemException.notFound("Authenticated user not found"));
    }

    private TrainingDocumentResponse toResponse(
            TrainingDocument doc, UserTrainingProgress progress) {
        List<String> checklistSteps = parseStringList(doc.getChecklistJson());
        List<Integer> checkedSteps =
                progress != null
                        ? parseIntegerList(progress.getCheckedStepsJson())
                        : Collections.emptyList();
        String progressStatus = progress != null ? progress.getStatus() : "NOT_STARTED";

        return TrainingDocumentResponse.builder()
                .id(doc.getId())
                .code(doc.getCode())
                .slug(doc.getSlug())
                .targetPortal(doc.getTargetPortal())
                .category(doc.getCategory())
                .level(doc.getLevel())
                .versionTag(doc.getVersionTag())
                .estimatedMinutes(doc.getEstimatedMinutes())
                .isMandatory(doc.getIsMandatory())
                .sortOrder(doc.getSortOrder())
                .active(doc.getActive())
                .title(doc.getTitle())
                .summary(doc.getSummary())
                .contentMarkdown(doc.getContentMarkdown())
                .checklistSteps(checklistSteps)
                .progressStatus(progressStatus)
                .checkedSteps(checkedSteps)
                .completedAt(progress != null ? progress.getCompletedAt() : null)
                .updatedAt(doc.getUpdatedAt())
                .build();
    }

    private List<String> parseStringList(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    private List<Integer> parseIntegerList(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Integer>>() {});
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "[]";
        }
    }

    private String buildUniqueSlug(String code, String title, Long currentId) {
        String raw = (code + "-" + (title != null ? title : "")).toLowerCase(Locale.ROOT);
        String normalized =
                Normalizer.normalize(raw, Normalizer.Form.NFD)
                        .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                        .replace('đ', 'd')
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("(^-|-$)", "");
        if (normalized.length() > 120) {
            normalized = normalized.substring(0, 120).replaceAll("-$", "");
        }
        String candidate = normalized;
        int suffix = 2;
        while (true) {
            var existing = trainingDocumentRepository.findBySlugIgnoreCase(candidate);
            if (existing.isEmpty()
                    || (currentId != null && existing.get().getId().equals(currentId))) {
                return candidate;
            }
            candidate = normalized + "-" + suffix++;
        }
    }
}
