package com.uav.platform.modules.station.specification;

import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.enums.StationStatus;

import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;
import java.util.Locale;

/**
 * Specification Factory for Station entity according to Clean Architecture and DDD.
 */
public final class StationSpecifications {

    private StationSpecifications() {}

    /**
     * Case-insensitive keyword search across code, name, and address.
     */
    public static Specification<Station> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("code")), pattern),
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(cb.coalesce(root.get("address"), "")), pattern));
        };
    }

    /**
     * Exact match on StationStatus.
     */
    public static Specification<Station> hasStatus(StationStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    /**
     * Filter by a collection of allowed StationStatuses.
     */
    public static Specification<Station> hasStatusIn(Collection<StationStatus> statuses) {
        return (root, query, cb) ->
                (statuses == null || statuses.isEmpty()) ? null : root.get("status").in(statuses);
    }

    /**
     * Filter by permitted station IDs (data scoping).
     */
    public static Specification<Station> idIn(Collection<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty()) {
                return cb.disjunction();
            }
            return root.get("id").in(ids);
        };
    }
}
