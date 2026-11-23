package com.uav.platform.dao.base;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.From;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Embedded FIQL/RSQL-style search query parser for {@link HibernateGenericDao}. Supports:
 * <ul>
 *   <li>AND groups separated by {@code ;} and OR groups separated by {@code ,}
 *   <li>Operators: {@code ==}, {@code !=}, {@code >=}, {@code <=}, {@code >}, {@code <},
 *       {@code :} (case-insensitive contains), {@code ~} (wildcard like)
 *   <li>Nested property navigation (e.g., {@code customer.username==alice})
 *   <li>Null checks ({@code field==null}, {@code field!=null})
 * </ul>
 */
public final class HibernateSearchQueryParser {

    private static final Pattern CRITERION_PATTERN =
            Pattern.compile("^\\s*([a-zA-Z0-9_.]+)\\s*(==|!=|>=|<=|>|<|:|~)\\s*(.*?)\\s*$");

    private HibernateSearchQueryParser() {}

    public static <T> HibernateSpecification<T> parse(String query) {
        if (query == null || query.isBlank()) {
            return HibernateSpecification.unrestricted();
        }
        String trimmed = query.trim();
        // Split top-level OR groups by ',' and AND expressions inside each group by ';'
        String[] orGroups = trimmed.split(",");
        List<HibernateSpecification<T>> orSpecs = new ArrayList<>();
        for (String group : orGroups) {
            if (group.isBlank()) continue;
            String[] andTerms = group.split(";");
            List<HibernateSpecification<T>> andSpecs = new ArrayList<>();
            for (String term : andTerms) {
                if (term.isBlank()) continue;
                Matcher m = CRITERION_PATTERN.matcher(term);
                if (!m.matches()) {
                    throw new IllegalArgumentException("Invalid search expression: " + term.trim());
                }
                String field = m.group(1);
                String op = m.group(2);
                String rawValue = stripQuotes(m.group(3));
                andSpecs.add(buildCriterion(field, op, rawValue));
            }
            if (!andSpecs.isEmpty()) {
                orSpecs.add(HibernateSpecification.allOf(andSpecs));
            }
        }
        return orSpecs.isEmpty()
                ? HibernateSpecification.unrestricted()
                : HibernateSpecification.anyOf(orSpecs);
    }

    private static String stripQuotes(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.length() >= 2
                && ((s.startsWith("\"") && s.endsWith("\""))
                        || (s.startsWith("'") && s.endsWith("'")))) {
            return s.substring(1, s.length() - 1);
        }
        return s;
    }

    private static <T> HibernateSpecification<T> buildCriterion(
            String fieldPath, String op, String rawValue) {
        return (Root<T> root,
                jakarta.persistence.criteria.CriteriaQuery<?> cq,
                CriteriaBuilder cb) -> {
            Path<?> path = resolvePath(root, fieldPath);
            if ("null".equalsIgnoreCase(rawValue)) {
                return switch (op) {
                    case "==" -> cb.isNull(path);
                    case "!=" -> cb.isNotNull(path);
                    default ->
                            throw new IllegalArgumentException(
                                    "Null comparison only supports == or != on field " + fieldPath);
                };
            }
            Class<?> targetType = path.getJavaType();
            return switch (op) {
                case "==" -> {
                    Object converted = convert(rawValue, targetType);
                    yield cb.equal(path, converted);
                }
                case "!=" -> {
                    Object converted = convert(rawValue, targetType);
                    yield cb.notEqual(path, converted);
                }
                case ":" -> {
                    Expression<String> text = path.as(String.class);
                    yield cb.like(cb.lower(text), "%" + rawValue.toLowerCase(Locale.ROOT) + "%");
                }
                case "~" -> {
                    Expression<String> text = path.as(String.class);
                    String pattern = rawValue.replace('*', '%');
                    if (!pattern.contains("%")) {
                        pattern = "%" + pattern + "%";
                    }
                    yield cb.like(cb.lower(text), pattern.toLowerCase(Locale.ROOT));
                }
                case ">", ">=", "<", "<=" -> buildComparison(cb, path, op, rawValue, targetType);
                default -> throw new IllegalArgumentException("Unsupported operator: " + op);
            };
        };
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static Predicate buildComparison(
            CriteriaBuilder cb, Path<?> path, String op, String rawValue, Class<?> targetType) {
        Object converted = convert(rawValue, targetType);
        if (!(converted instanceof Comparable comparable)) {
            throw new IllegalArgumentException(
                    "Operator " + op + " requires a comparable field type, got " + targetType);
        }
        Expression<Comparable> expr = (Expression<Comparable>) path;
        return switch (op) {
            case ">" -> cb.greaterThan(expr, comparable);
            case ">=" -> cb.greaterThanOrEqualTo(expr, comparable);
            case "<" -> cb.lessThan(expr, comparable);
            case "<=" -> cb.lessThanOrEqualTo(expr, comparable);
            default -> throw new IllegalArgumentException("Unsupported comparison operator: " + op);
        };
    }

    static Path<?> resolvePath(Root<?> root, String propertyPath) {
        String[] segments = propertyPath.split("\\.");
        Path<?> current = root;
        for (int i = 0; i < segments.length; i++) {
            String segment = segments[i];
            if (i < segments.length - 1 && current instanceof From<?, ?> from) {
                current = from.join(segment, JoinType.LEFT);
            } else {
                current = current.get(segment);
            }
        }
        return current;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Object convert(String raw, Class<?> targetType) {
        if (targetType == null || targetType == String.class) {
            return raw;
        }
        if (targetType == Long.class || targetType == long.class) {
            return Long.valueOf(raw);
        }
        if (targetType == Integer.class || targetType == int.class) {
            return Integer.valueOf(raw);
        }
        if (targetType == Short.class || targetType == short.class) {
            return Short.valueOf(raw);
        }
        if (targetType == Double.class || targetType == double.class) {
            return Double.valueOf(raw);
        }
        if (targetType == Float.class || targetType == float.class) {
            return Float.valueOf(raw);
        }
        if (targetType == BigDecimal.class) {
            return new BigDecimal(raw);
        }
        if (targetType == Boolean.class || targetType == boolean.class) {
            return Boolean.valueOf(raw);
        }
        if (targetType.isEnum()) {
            return Enum.valueOf((Class<Enum>) targetType, raw.trim().toUpperCase(Locale.ROOT));
        }
        if (targetType == LocalDate.class) {
            return LocalDate.parse(raw);
        }
        if (targetType == LocalDateTime.class) {
            return LocalDateTime.parse(raw);
        }
        if (targetType == Instant.class) {
            return Instant.parse(raw);
        }
        if (targetType == UUID.class) {
            return UUID.fromString(raw);
        }
        return raw;
    }
}
