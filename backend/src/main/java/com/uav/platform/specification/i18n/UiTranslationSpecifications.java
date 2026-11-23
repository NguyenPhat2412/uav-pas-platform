package com.uav.platform.specification.i18n;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.i18n.UiTranslation;

import org.springframework.util.StringUtils;

public final class UiTranslationSpecifications {
    private UiTranslationSpecifications() {}

    public static HibernateSpecification<UiTranslation> filter(
            String locale, String namespace, String keyword) {
        return (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (StringUtils.hasText(locale)) {
                predicates.add(cb.equal(root.get("locale"), locale.trim().toLowerCase()));
            }
            if (StringUtils.hasText(namespace)) {
                predicates.add(cb.equal(root.get("namespace"), namespace.trim()));
            }
            if (StringUtils.hasText(keyword)) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(
                        cb.or(
                                cb.like(cb.lower(root.get("translationKey")), pattern),
                                cb.like(cb.lower(root.get("messageText")), pattern)));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
