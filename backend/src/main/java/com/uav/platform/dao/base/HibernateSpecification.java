package com.uav.platform.dao.base;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import java.util.Arrays;
import java.util.Objects;

/**
 * Pure Hibernate / Jakarta Criteria API specification contract (zero Spring Data JPA dependency).
 * Composable null-safe predicates executed directly inside {@link HibernateGenericDao}.
 */
@FunctionalInterface
public interface HibernateSpecification<T> {

    Predicate toPredicate(Root<T> root, CriteriaQuery<?> query, CriteriaBuilder cb);

    static <T> HibernateSpecification<T> unrestricted() {
        return (root, query, cb) -> null;
    }

    static <T> HibernateSpecification<T> where(HibernateSpecification<T> spec) {
        return spec == null ? unrestricted() : spec;
    }

    static <T> HibernateSpecification<T> not(HibernateSpecification<T> spec) {
        if (spec == null) {
            return unrestricted();
        }
        return (root, query, cb) -> {
            Predicate predicate = spec.toPredicate(root, query, cb);
            return predicate == null ? null : cb.not(predicate);
        };
    }

    @SafeVarargs
    static <T> HibernateSpecification<T> allOf(HibernateSpecification<T>... specs) {
        if (specs == null || specs.length == 0) {
            return unrestricted();
        }
        return allOf(Arrays.asList(specs));
    }

    static <T> HibernateSpecification<T> allOf(Iterable<HibernateSpecification<T>> specs) {
        HibernateSpecification<T> result = unrestricted();
        if (specs == null) {
            return result;
        }
        for (HibernateSpecification<T> spec : specs) {
            if (spec != null) {
                result = result.and(spec);
            }
        }
        return result;
    }

    @SafeVarargs
    static <T> HibernateSpecification<T> anyOf(HibernateSpecification<T>... specs) {
        if (specs == null || specs.length == 0) {
            return unrestricted();
        }
        return anyOf(Arrays.asList(specs));
    }

    static <T> HibernateSpecification<T> anyOf(Iterable<HibernateSpecification<T>> specs) {
        HibernateSpecification<T> result = unrestricted();
        if (specs == null) {
            return result;
        }
        for (HibernateSpecification<T> spec : specs) {
            if (spec != null) {
                result = result.or(spec);
            }
        }
        return result;
    }

    default HibernateSpecification<T> and(HibernateSpecification<T> other) {
        if (other == null) {
            return this;
        }
        return (root, query, cb) -> {
            Predicate left = this.toPredicate(root, query, cb);
            Predicate right = other.toPredicate(root, query, cb);
            if (left == null) return right;
            if (right == null) return left;
            return cb.and(left, right);
        };
    }

    default HibernateSpecification<T> or(HibernateSpecification<T> other) {
        if (other == null) {
            return this;
        }
        return (root, query, cb) -> {
            Predicate left = this.toPredicate(root, query, cb);
            Predicate right = other.toPredicate(root, query, cb);
            if (left == null) return right;
            if (right == null) return left;
            return cb.or(left, right);
        };
    }

    static <T> HibernateSpecification<T> of(HibernateSpecification<T> spec) {
        return Objects.requireNonNullElseGet(spec, HibernateSpecification::unrestricted);
    }
}
