package com.uav.platform.specification;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.PaymentTransaction;
import com.uav.platform.enums.InvoiceStatus;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

import org.junit.jupiter.api.Test;
import org.mockito.Answers;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Exercises every static {@link HibernateSpecification} factory across all 24 specification classes
 * with null/blank, empty-collection, and populated inputs, plus targeted assertions on previously
 * uncovered Billing, Webhook, and SystemConfig specifications.
 */
class AllSpecificationsUnitTest {

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void all24SpecificationClassesExecuteNullBlankAndPopulatedPredicates() throws Exception {
        java.nio.file.Path specDir =
                Files.isDirectory(
                                java.nio.file.Path.of(
                                        "src/main/java/com/uav/platform/specification"))
                        ? java.nio.file.Path.of("src/main/java/com/uav/platform/specification")
                        : java.nio.file.Path.of(
                                "backend/src/main/java/com/uav/platform/specification");

        List<java.nio.file.Path> files;
        try (var stream = Files.list(specDir)) {
            files =
                    stream.filter(p -> p.toString().endsWith("Specifications.java"))
                            .sorted()
                            .toList();
        }
        assertEquals(
                24, files.size(), "Expected all 24 specification classes in flat specification/");

        int executedMethods = 0;
        List<String> failures = new ArrayList<>();

        for (java.nio.file.Path file : files) {
            String simpleName = file.getFileName().toString().replace(".java", "");
            Class<?> specClass = Class.forName("com.uav.platform.specification." + simpleName);

            for (Method method : specClass.getDeclaredMethods()) {
                if (!Modifier.isPublic(method.getModifiers())
                        || !Modifier.isStatic(method.getModifiers())
                        || !HibernateSpecification.class.isAssignableFrom(method.getReturnType())) {
                    continue;
                }
                executedMethods++;
                try {
                    invokeSpec(method, buildArgs(method, Mode.POPULATED));
                    if (method.getParameterCount() > 0) {
                        invokeSpec(method, buildArgs(method, Mode.NULL_OR_ZERO));
                        invokeSpec(method, buildArgs(method, Mode.BLANK_OR_EMPTY));
                    }
                } catch (Exception ex) {
                    Throwable root = ex.getCause() != null ? ex.getCause() : ex;
                    failures.add(
                            simpleName
                                    + "#"
                                    + method.getName()
                                    + " -> "
                                    + root.getClass().getSimpleName()
                                    + ": "
                                    + root.getMessage());
                }
            }
        }

        assertTrue(
                failures.isEmpty(),
                "Specification failures ("
                        + failures.size()
                        + "):\n"
                        + String.join("\n", failures));
        assertTrue(
                executedMethods >= 80,
                "Expected at least 80 specification factory methods, got " + executedMethods);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void billingWebhookAndSystemConfigSpecificationsNormalizeAndEscapeInputs() {
        Root<PaymentTransaction> root = mockRoot();
        CriteriaQuery<?> query = mockQuery();
        CriteriaBuilder cb = mockCriteriaBuilder();

        assertNull(BillingSpecifications.belongsToUser(null).toPredicate(mockRoot(), query, cb));
        assertNotNull(BillingSpecifications.belongsToUser(7L).toPredicate(mockRoot(), query, cb));
        assertNull(BillingSpecifications.hasStatus(null).toPredicate(mockRoot(), query, cb));
        assertNotNull(
                BillingSpecifications.hasStatus(InvoiceStatus.PAID)
                        .toPredicate(mockRoot(), query, cb));
        assertNull(BillingSpecifications.isActive(null).toPredicate(mockRoot(), query, cb));
        assertNotNull(BillingSpecifications.isActive(true).toPredicate(mockRoot(), query, cb));
        assertNull(BillingSpecifications.quotaForUser(null).toPredicate(mockRoot(), query, cb));
        assertNotNull(BillingSpecifications.quotaForUser(3L).toPredicate(mockRoot(), query, cb));

        assertNull(BillingSpecifications.transactionStatus("  ").toPredicate(root, query, cb));
        assertNotNull(
                BillingSpecifications.transactionStatus(" paid ").toPredicate(root, query, cb));
        verify(cb).equal(any(), eq("PAID"));

        assertNull(BillingSpecifications.transactionGateway(null).toPredicate(root, query, cb));
        assertNotNull(
                BillingSpecifications.transactionGateway(" vnpay ").toPredicate(root, query, cb));
        verify(cb).equal(any(), eq("VNPAY"));

        assertNull(BillingSpecifications.transactionKeyword("   ").toPredicate(root, query, cb));
        assertNotNull(
                BillingSpecifications.transactionKeyword("  50%_test\\a ")
                        .toPredicate(root, query, cb));
        verify(cb, atLeast(5)).like(any(), eq("%50\\%\\_test\\\\a%"), eq('\\'));

        assertNotNull(WebhookSpecifications.isActive().toPredicate(mockRoot(), query, cb));
        assertNull(WebhookSpecifications.hasEventType(" ").toPredicate(mockRoot(), query, cb));
        assertNotNull(
                WebhookSpecifications.hasEventType("MISSION_CREATED")
                        .toPredicate(mockRoot(), query, cb));
        assertNull(WebhookSpecifications.isSuccessful(null).toPredicate(mockRoot(), query, cb));
        assertNotNull(WebhookSpecifications.isSuccessful(false).toPredicate(mockRoot(), query, cb));
        assertNull(WebhookSpecifications.outboxStatus("").toPredicate(mockRoot(), query, cb));
        assertNotNull(
                WebhookSpecifications.outboxStatus(" pending ").toPredicate(mockRoot(), query, cb));

        assertNull(SystemConfigSpecifications.hasCategory(" ").toPredicate(mockRoot(), query, cb));
        assertNotNull(
                SystemConfigSpecifications.hasCategory("OPS").toPredicate(mockRoot(), query, cb));
        assertNull(
                SystemConfigSpecifications.hasConfigKey(null).toPredicate(mockRoot(), query, cb));
        assertNotNull(
                SystemConfigSpecifications.hasConfigKey("mail.host")
                        .toPredicate(mockRoot(), query, cb));
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void invokeSpec(Method method, Object[] args) throws Exception {
        HibernateSpecification spec = (HibernateSpecification) method.invoke(null, args);
        assertNotNull(spec, method.getDeclaringClass().getSimpleName() + "#" + method.getName());
        spec.toPredicate(mockRoot(), mockQuery(), mockCriteriaBuilder());
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private Root mockRoot() {
        Root root = mock(Root.class, Answers.RETURNS_DEEP_STUBS);
        Path path = mockPath();
        Join join = mock(Join.class, Answers.RETURNS_DEEP_STUBS);
        when(root.get(anyString())).thenReturn(path);
        when(root.join(anyString())).thenReturn(join);
        when(root.join(anyString(), any(JoinType.class))).thenReturn(join);
        when(join.get(anyString())).thenReturn(path);
        when(join.join(anyString())).thenReturn(join);
        when(join.join(anyString(), any(JoinType.class))).thenReturn(join);
        return root;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private Path mockPath() {
        Path path =
                mock(
                        Path.class,
                        withSettings()
                                .extraInterfaces(org.hibernate.query.criteria.JpaExpression.class)
                                .defaultAnswer(Answers.RETURNS_DEEP_STUBS));
        Predicate pred = mock(org.hibernate.query.criteria.JpaPredicate.class);
        when(path.get(anyString())).thenReturn(path);
        when(path.in(any(Collection.class))).thenReturn(pred);
        when(path.in(any(Object[].class))).thenReturn(pred);
        when(path.isNull()).thenReturn(pred);
        when(path.isNotNull()).thenReturn(pred);
        return path;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private CriteriaQuery mockQuery() {
        CriteriaQuery query = mock(CriteriaQuery.class, Answers.RETURNS_DEEP_STUBS);
        Subquery sub = mock(Subquery.class, Answers.RETURNS_DEEP_STUBS);
        Root subRoot = mockRoot();
        when(query.subquery(any(Class.class))).thenReturn(sub);
        when(sub.from(any(Class.class))).thenReturn(subRoot);
        when(sub.select(any())).thenReturn(sub);
        when(sub.where(any(Predicate[].class))).thenReturn(sub);
        when(sub.where(any(Expression.class))).thenReturn(sub);
        return query;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private CriteriaBuilder mockCriteriaBuilder() {
        CriteriaBuilder cb = mock(CriteriaBuilder.class, Answers.RETURNS_DEEP_STUBS);
        Predicate pred = mock(org.hibernate.query.criteria.JpaPredicate.class);
        Expression strExpr = mock(Expression.class);
        when(cb.conjunction()).thenReturn(pred);
        when(cb.disjunction()).thenReturn(pred);
        when(cb.equal(any(), any())).thenReturn(pred);
        when(cb.notEqual(any(), any())).thenReturn(pred);
        when(cb.isTrue(any())).thenReturn(pred);
        when(cb.isFalse(any())).thenReturn(pred);
        when(cb.isNull(any())).thenReturn(pred);
        when(cb.isNotNull(any())).thenReturn(pred);
        when(cb.lower(any())).thenReturn(strExpr);
        when(cb.upper(any())).thenReturn(strExpr);
        when(cb.like(any(), anyString())).thenReturn(pred);
        when(cb.like(any(), anyString(), anyChar())).thenReturn(pred);
        when(cb.greaterThan(any(), any(Comparable.class))).thenReturn(pred);
        when(cb.greaterThanOrEqualTo(any(), any(Comparable.class))).thenReturn(pred);
        when(cb.lessThan(any(), any(Comparable.class))).thenReturn(pred);
        when(cb.lessThanOrEqualTo(any(), any(Comparable.class))).thenReturn(pred);
        when(cb.between(any(), any(Comparable.class), any(Comparable.class))).thenReturn(pred);
        when(cb.and(any(Predicate[].class))).thenReturn(pred);
        when(cb.and(any(Expression.class), any(Expression.class))).thenReturn(pred);
        when(cb.or(any(Predicate[].class))).thenReturn(pred);
        when(cb.or(any(Expression.class), any(Expression.class))).thenReturn(pred);
        when(cb.not(any())).thenReturn(pred);
        when(cb.exists(any())).thenReturn(pred);
        return cb;
    }

    private enum Mode {
        POPULATED,
        NULL_OR_ZERO,
        BLANK_OR_EMPTY
    }

    private Object[] buildArgs(Method method, Mode mode) {
        Class<?>[] types = method.getParameterTypes();
        Type[] generics = method.getGenericParameterTypes();
        Object[] args = new Object[types.length];
        for (int i = 0; i < types.length; i++) {
            args[i] = sampleValue(types[i], generics[i], mode);
        }
        return args;
    }

    private Object sampleValue(Class<?> type, Type genericType, Mode mode) {
        if (mode == Mode.NULL_OR_ZERO) {
            if (!type.isPrimitive()) return null;
            if (type == boolean.class) return false;
            if (type == int.class) return 0;
            if (type == long.class) return 0L;
            if (type == double.class) return 0.0d;
            return 0;
        }
        if (mode == Mode.BLANK_OR_EMPTY) {
            if (type == String.class) return "   ";
            if (List.class.isAssignableFrom(type) || Collection.class == type) return List.of();
            if (Set.class.isAssignableFrom(type)) return Set.of();
            if (type == Boolean.class || type == boolean.class) return false;
            if (!type.isPrimitive() && !type.isRecord()) return null;
        }
        if (type == String.class) return "test_value";
        if (type == Long.class || type == long.class) return 1L;
        if (type == Integer.class || type == int.class) return 2;
        if (type == Double.class || type == double.class) return 12.5d;
        if (type == Boolean.class || type == boolean.class) return true;
        if (type == BigDecimal.class) return BigDecimal.TEN;
        if (type == LocalDateTime.class) return LocalDateTime.of(2026, 6, 1, 9, 0);
        if (type == LocalDate.class) return LocalDate.of(2026, 6, 1);
        if (type == Instant.class) return Instant.parse("2026-06-01T09:00:00Z");
        if (type.isEnum()) {
            Object[] constants = type.getEnumConstants();
            return constants != null && constants.length > 0 ? constants[0] : null;
        }
        if (List.class.isAssignableFrom(type) || Collection.class == type) {
            Object elem = sampleTypeArg(genericType, mode);
            return elem != null ? List.of(elem) : List.of("a");
        }
        if (Set.class.isAssignableFrom(type)) {
            Object elem = sampleTypeArg(genericType, mode);
            return elem != null ? Set.of(elem) : Set.of("a");
        }
        if (type.isRecord()) {
            RecordComponent[] comps = type.getRecordComponents();
            Class<?>[] paramTypes = new Class<?>[comps.length];
            Object[] vals = new Object[comps.length];
            for (int i = 0; i < comps.length; i++) {
                paramTypes[i] = comps[i].getType();
                vals[i] = sampleValue(comps[i].getType(), comps[i].getGenericType(), mode);
            }
            try {
                var ctor = type.getDeclaredConstructor(paramTypes);
                ctor.setAccessible(true);
                return ctor.newInstance(vals);
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private Object sampleTypeArg(Type genericType, Mode mode) {
        if (genericType instanceof ParameterizedType pt
                && pt.getActualTypeArguments().length > 0
                && pt.getActualTypeArguments()[0] instanceof Class<?> cls) {
            return sampleValue(cls, cls, mode);
        }
        return null;
    }
}
