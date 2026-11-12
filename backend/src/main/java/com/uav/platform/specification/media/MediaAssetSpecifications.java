package com.uav.platform.specification.media;

import com.uav.platform.entity.media.MediaAsset;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.media.MediaType;

import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Locale;

/**
 * Atomic Specification factories for querying {@link MediaAsset} entities.
 * <p>
 * Follows DDD and Clean Architecture by decoupling query predicate construction
 * from data access repositories. All methods are null-safe and return {@code null}
 * when arguments are empty/null so Spring Data JPA's {@code .and()} drops them automatically.
 */
public final class MediaAssetSpecifications {

    private MediaAssetSpecifications() {
        // Enforce non-instantiability
    }

    /**
     * Case-insensitive keyword search matching originalName, objectKey, or uploadedBy.
     */
    public static Specification<MediaAsset> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("originalName")), pattern),
                    cb.like(cb.lower(root.get("objectKey")), pattern),
                    cb.like(cb.lower(root.get("uploadedBy")), pattern));
        };
    }

    /**
     * Filters media assets by uploader username.
     */
    public static Specification<MediaAsset> hasUploader(String uploadedBy) {
        return (root, query, cb) -> {
            if (uploadedBy == null || uploadedBy.isBlank()) {
                return null;
            }
            return cb.equal(
                    cb.lower(root.get("uploadedBy")), uploadedBy.trim().toLowerCase(Locale.ROOT));
        };
    }

    /**
     * Filters media assets by media type (IMAGE, VIDEO, DOCUMENT, TELEMETRY, OTHER).
     */
    public static Specification<MediaAsset> hasType(MediaType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("type"), type);
    }

    /**
     * Filters media assets by MIME content-type.
     */
    public static Specification<MediaAsset> hasContentType(String contentType) {
        return (root, query, cb) -> {
            if (contentType == null || contentType.isBlank()) {
                return null;
            }
            return cb.equal(
                    cb.lower(root.get("contentType")), contentType.trim().toLowerCase(Locale.ROOT));
        };
    }

    /**
     * Filters media assets by confirmation status.
     */
    public static Specification<MediaAsset> isConfirmed(Boolean confirmed) {
        return (root, query, cb) ->
                confirmed == null ? null : cb.equal(root.get("confirmed"), confirmed);
    }

    /**
     * Filters media assets by deletion status (soft delete flag).
     */
    public static Specification<MediaAsset> isDeleted(Boolean deleted) {
        return (root, query, cb) -> deleted == null ? null : cb.equal(root.get("deleted"), deleted);
    }

    /**
     * Filters media assets linked to a specific domain entity.
     */
    public static Specification<MediaAsset> hasLinkedEntity(
            String linkedEntityType, String linkedEntityId) {
        return (root, query, cb) -> {
            boolean hasType = linkedEntityType != null && !linkedEntityType.isBlank();
            boolean hasId = linkedEntityId != null && !linkedEntityId.isBlank();

            if (!hasType && !hasId) {
                return null;
            }
            if (hasType && hasId) {
                return cb.and(
                        cb.equal(
                                cb.lower(root.get("linkedEntityType")),
                                linkedEntityType.trim().toLowerCase(Locale.ROOT)),
                        cb.equal(root.get("linkedEntityId"), linkedEntityId.trim()));
            }
            if (hasType) {
                return cb.equal(
                        cb.lower(root.get("linkedEntityType")),
                        linkedEntityType.trim().toLowerCase(Locale.ROOT));
            }
            return cb.equal(root.get("linkedEntityId"), linkedEntityId.trim());
        };
    }

    /**
     * Filters media assets created within a specific timestamp window [from, to].
     */
    public static Specification<MediaAsset> createdBetween(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) {
                return null;
            }
            if (from != null && to != null) {
                return cb.and(
                        cb.greaterThanOrEqualTo(root.get("createdAt"), from),
                        cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            return from != null
                    ? cb.greaterThanOrEqualTo(root.get("createdAt"), from)
                    : cb.lessThanOrEqualTo(root.get("createdAt"), to);
        };
    }

    /**
     * Composable composite filter for common media query scenarios.
     */
    public static Specification<MediaAsset> filter(
            String keyword, MediaType type, Boolean confirmed, Boolean deleted) {
        return Specification.where(hasKeyword(keyword))
                .and(hasType(type))
                .and(isConfirmed(confirmed))
                .and(isDeleted(deleted));
    }

    /**
     * Detailed composite filter for media asset search and audit filtering.
     */
    public static Specification<MediaAsset> filter(
            String keyword,
            MediaType type,
            String uploadedBy,
            Boolean confirmed,
            Boolean deleted,
            LocalDateTime from,
            LocalDateTime to) {
        return Specification.where(hasKeyword(keyword))
                .and(hasType(type))
                .and(hasUploader(uploadedBy))
                .and(isConfirmed(confirmed))
                .and(isDeleted(deleted))
                .and(createdBetween(from, to));
    }
}
