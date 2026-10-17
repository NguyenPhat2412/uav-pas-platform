package com.uav.platform.modules.media.specification;

import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.media.entity.MediaAsset;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.uav.entity.Uav;

import jakarta.persistence.criteria.*;

import org.hibernate.query.criteria.JpaExpression;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;

/** Database equivalent of MediaAccessService.requireFile(asset, actor, false). */
public final class MediaVisibilitySpecifications {
    private static final String JAVA_NONBLANK;
    private static final String UNICODE_DIGITS;
    private static final String ASCII_DIGITS;

    static {
        var whitespace = new StringBuilder("[^");
        var unicode = new StringBuilder();
        var ascii = new StringBuilder();
        for (int value = 0; value <= Character.MAX_VALUE; value++) {
            char character = (char) value;
            if (Character.isWhitespace(character)) whitespace.append(character);
            int digit = Character.digit(character, 10);
            if (digit >= 0 && (character < '0' || character > '9')) {
                unicode.append(character);
                ascii.append((char) ('0' + digit));
            }
        }
        JAVA_NONBLANK = whitespace.append("]").toString();
        UNICODE_DIGITS = unicode.toString();
        ASCII_DIGITS = ascii.toString();
    }

    private MediaVisibilitySpecifications() {}

    public record ReadPermissions(
            boolean manageMedia,
            boolean viewMissionMedia,
            boolean viewAllMissions,
            boolean readStations,
            boolean readUavs,
            boolean readInventory) {}

    public static Specification<MediaAsset> readableBy(String actor, ReadPermissions permissions) {
        return (asset, query, cb) -> {
            if (actor == null) return cb.disjunction();
            var uploader =
                    permissions.manageMedia()
                            ? cb.conjunction()
                            : cb.equal(asset.get("uploadedBy"), actor);
            var rules = new ArrayList<Predicate>();
            rules.add(
                    cb.and(
                            blank(asset.get("linkedEntityType"), cb),
                            blank(asset.get("linkedEntityId"), cb),
                            uploader));
            Expression<String> linkedId = normalizedId(asset.get("linkedEntityId"), cb);

            if (permissions.viewMissionMedia()) {
                var exists = query.subquery(Long.class);
                var mission = exists.from(Mission.class);
                Predicate participant = cb.conjunction();
                if (!permissions.viewAllMissions()) {
                    // LEFT joins keep customer-owned missions visible when no operator is assigned.
                    participant =
                            cb.or(
                                    cb.equal(
                                            mission.join("customer", JoinType.LEFT).get("username"),
                                            actor),
                                    cb.equal(
                                            mission.join("operator", JoinType.LEFT).get("username"),
                                            actor));
                }
                exists.select(mission.get("id"))
                        .where(idMatches(linkedId, mission.get("id"), cb), participant);
                rules.add(
                        cb.and(
                                cb.equal(asset.get("linkedEntityType"), "MISSION"),
                                cb.exists(exists)));
            }
            if (permissions.readStations())
                rules.add(
                        cb.and(
                                uploader,
                                linkedResource(
                                        asset, query, cb, linkedId, "STATION", Station.class)));
            if (permissions.readUavs())
                rules.add(
                        cb.and(
                                uploader,
                                linkedResource(asset, query, cb, linkedId, "UAV", Uav.class)));
            if (permissions.readInventory())
                rules.add(
                        cb.and(
                                uploader,
                                linkedResource(
                                        asset, query, cb, linkedId, "EQUIPMENT", Equipment.class)));
            return cb.or(rules.toArray(Predicate[]::new));
        };
    }

    private static Predicate linkedResource(
            Root<MediaAsset> asset,
            CriteriaQuery<?> query,
            CriteriaBuilder cb,
            Expression<String> linkedId,
            String type,
            Class<?> entity) {
        var exists = query.subquery(Long.class);
        var resource = exists.from(entity);
        exists.select(resource.get("id")).where(idMatches(linkedId, resource.get("id"), cb));
        return cb.and(cb.equal(asset.get("linkedEntityType"), type), cb.exists(exists));
    }

    private static Predicate idMatches(
            Expression<String> linkedId, Expression<Long> resourceId, CriteriaBuilder cb) {
        // Cast the trusted numeric PK to text, never arbitrary imported text to bigint.
        return cb.equal(linkedId, ((JpaExpression<Long>) resourceId).cast(String.class));
    }

    private static Predicate blank(Expression<String> value, CriteriaBuilder cb) {
        // PostgreSQL 16 and H2 support regexp_like. Match String.isBlank exactly,
        // including tabs and Unicode whitespace accepted by requireLink.
        return cb.or(
                cb.isNull(value),
                cb.isFalse(
                        cb.function(
                                "regexp_like", Boolean.class, value, cb.literal(JAVA_NONBLANK))));
    }

    private static Expression<String> normalizedId(Expression<String> value, CriteriaBuilder cb) {
        // Java Long.parseLong also accepts BMP Unicode decimal digits. Keep those
        // existing links readable, with a cheap path for ordinary ASCII IDs.
        value =
                cb.<String>selectCase()
                        .when(
                                cb.isTrue(
                                        cb.function(
                                                "regexp_like",
                                                Boolean.class,
                                                value,
                                                cb.literal("^[+-]?[0-9]+$"))),
                                value)
                        .otherwise(
                                cb.function(
                                        "translate",
                                        String.class,
                                        value,
                                        cb.literal(UNICODE_DIGITS),
                                        cb.literal(ASCII_DIGITS)));
        // Long.parseLong accepts a leading sign and zeroes. Preserve those legacy links
        // without a database numeric cast that could fail on malformed/overflowing IDs.
        var first = cb.substring(value, 1, 1);
        Expression<String> digits =
                cb.<String>selectCase()
                        .when(first.in("+", "-"), cb.substring(value, 2))
                        .otherwise(value);
        var trimmed = cb.trim(CriteriaBuilder.Trimspec.LEADING, '0', digits);
        Expression<String> number =
                cb.<String>selectCase().when(cb.equal(trimmed, ""), "0").otherwise(trimmed);
        return cb.<String>selectCase()
                .when(
                        cb.or(cb.equal(digits, ""), cb.like(trimmed, "-%"), cb.like(trimmed, "+%")),
                        cb.nullLiteral(String.class))
                .when(
                        cb.and(cb.equal(first, "-"), cb.notEqual(number, "0")),
                        cb.concat("-", number))
                .otherwise(number);
    }
}
