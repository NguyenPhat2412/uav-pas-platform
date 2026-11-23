package com.uav.platform.specification.marketplace.catalog;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.marketplace.ProviderPayout;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PayoutStatus;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.mission.MissionType;

import jakarta.persistence.criteria.JoinType;

import java.math.BigDecimal;
import java.util.Locale;

public final class MarketplaceSpecifications {

    private MarketplaceSpecifications() {}

    public static HibernateSpecification<MarketplaceListing> listingNotDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("deleted"));
    }

    public static HibernateSpecification<MarketplaceListing> listingModerationStatus(
            ListingModerationStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.equal(root.get("moderationStatus"), status);
    }

    public static HibernateSpecification<MarketplaceListing> listingType(ListingType type) {
        return (root, query, cb) -> type == null ? null : cb.equal(root.get("listingType"), type);
    }

    public static HibernateSpecification<MarketplaceListing> listingMissionType(
            MissionType missionType) {
        return (root, query, cb) ->
                missionType == null ? null : cb.equal(root.get("missionType"), missionType);
    }

    public static HibernateSpecification<MarketplaceListing> listingPricingModel(
            PricingModel pricingModel) {
        return (root, query, cb) ->
                pricingModel == null ? null : cb.equal(root.get("pricingModel"), pricingModel);
    }

    public static HibernateSpecification<MarketplaceListing> listingProvince(String province) {
        return (root, query, cb) -> {
            if (province == null || province.isBlank()) return null;
            String like = "%" + province.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("province")), like),
                    cb.equal(cb.lower(root.get("province")), "toàn quốc"));
        };
    }

    public static HibernateSpecification<MarketplaceListing> listingKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return null;
            String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), like),
                    cb.like(cb.lower(root.get("summary")), like),
                    cb.like(cb.lower(root.get("equipmentSpecs")), like),
                    cb.like(cb.lower(root.get("province")), like));
        };
    }

    public static HibernateSpecification<MarketplaceListing> listingMaxPrice(BigDecimal maxPrice) {
        return (root, query, cb) ->
                maxPrice == null ? null : cb.lessThanOrEqualTo(root.get("basePriceVnd"), maxPrice);
    }

    public static HibernateSpecification<MarketplaceListing> listingCategoryService(
            Long categoryServiceId) {
        return (root, query, cb) ->
                categoryServiceId == null
                        ? null
                        : cb.equal(root.get("categoryService").get("id"), categoryServiceId);
    }

    public static HibernateSpecification<MarketplaceListing> listingCategory(String category) {
        return (root, query, cb) -> {
            if (category == null || category.isBlank()) {
                return null;
            }
            String trimmed = category.trim();
            String lower = trimmed.toLowerCase(Locale.ROOT);
            var serviceJoin = root.join("categoryService", JoinType.LEFT);
            var byCode = cb.equal(cb.lower(serviceJoin.get("code")), lower);
            var byName = cb.like(cb.lower(serviceJoin.get("name")), "%" + lower + "%");
            var byMissionType = cb.equal(cb.lower(root.get("missionType").as(String.class)), lower);
            try {
                Long numericId = Long.parseLong(trimmed);
                return cb.or(
                        byCode, byName, byMissionType, cb.equal(serviceJoin.get("id"), numericId));
            } catch (NumberFormatException ignored) {
                return cb.or(byCode, byName, byMissionType);
            }
        };
    }

    public static HibernateSpecification<ProviderProfile> providerStatus(
            ProviderVerificationStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.equal(root.get("verificationStatus"), status);
    }

    public static HibernateSpecification<ProviderProfile> providerKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return null;
            String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("displayName")), like),
                    cb.like(cb.lower(root.get("slug")), like),
                    cb.like(cb.lower(root.get("province")), like));
        };
    }

    public static HibernateSpecification<ProviderPayout> payoutStatus(PayoutStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }
}
