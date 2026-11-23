package com.uav.platform.dao;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.impl.training.TrainingLessonProgressDaoImpl;
import com.uav.platform.dao.impl.training.UserTrainingProgressDaoImpl;
import com.uav.platform.dao.impl.uav.UavTelemetryDaoImpl;
import com.uav.platform.dao.training.ITrainingLessonProgressDao;
import com.uav.platform.entity.uav.UavTelemetry;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.hibernate.query.MutationQuery;
import org.hibernate.query.NativeQuery;
import org.hibernate.query.Query;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Verifies every concrete {@link HibernateGenericDao} implementation bean registered in Spring
 * executes its HQL, Criteria, EntityGraph, Locking, and Pagination queries cleanly against
 * Hibernate {@link Session} without syntax or parameter-binding errors.
 */
@SpringBootTest
@Transactional
class AllHibernateDaosIntegrationTest {

    private static final Set<String> PG_NATIVE_METHODS =
            Set.of(
                    "TrainingLessonProgressDaoImpl#upsertProgress",
                    "UserTrainingProgressDaoImpl#insertIfAbsent",
                    "UavTelemetryDaoImpl#latestPerUav");

    @Autowired private ApplicationContext applicationContext;

    @Test
    void all76HibernateDaoBeansExecuteCustomQueriesCleanly() throws Exception {
        @SuppressWarnings("rawtypes")
        Map<String, HibernateGenericDao> daos =
                applicationContext.getBeansOfType(HibernateGenericDao.class);
        assertEquals(76, daos.size(), "Expected all 76 Hibernate DAO implementations registered");

        int executedMethods = 0;
        for (HibernateGenericDao<?, ?> bean : daos.values()) {
            Class<?> targetClass = AopUtils.getTargetClass(bean);
            for (Method method : targetClass.getDeclaredMethods()) {
                if (!Modifier.isPublic(method.getModifiers()) || method.isSynthetic()) {
                    continue;
                }
                String key = targetClass.getSimpleName() + "#" + method.getName();
                if (PG_NATIVE_METHODS.contains(key)) {
                    continue;
                }
                // Exercise both non-empty and empty collections where applicable
                Object[] populatedArgs = buildArgs(method, false);
                if (populatedArgs == null) {
                    continue;
                }
                method.invoke(bean, populatedArgs);
                executedMethods++;

                if (hasCollectionParam(method)) {
                    Object[] emptyArgs = buildArgs(method, true);
                    if (emptyArgs != null) {
                        method.invoke(bean, emptyArgs);
                    }
                }
            }
        }
        assertTrue(
                executedMethods >= 220,
                "Expected at least 220 custom Hibernate DAO methods verified, got "
                        + executedMethods);
    }

    @Test
    @SuppressWarnings("unchecked")
    void postgresNativeDaoMethodsAndProjectionMappingWork() {
        EntityManager em = mock(EntityManager.class);
        Session session = mock(Session.class);
        MutationQuery mutation = mock(MutationQuery.class);
        NativeQuery<UavTelemetry> nativeQuery = mock(NativeQuery.class);
        Query<Object[]> objQuery = mock(Query.class);

        when(em.unwrap(Session.class)).thenReturn(session);
        when(session.createNativeMutationQuery(anyString())).thenReturn(mutation);
        when(mutation.setParameter(anyString(), any())).thenReturn(mutation);
        when(mutation.executeUpdate()).thenReturn(1);
        when(session.createNativeQuery(anyString(), eq(UavTelemetry.class)))
                .thenReturn(nativeQuery);
        when(nativeQuery.getResultList()).thenReturn(List.of());
        when(session.createQuery(anyString(), eq(Object[].class))).thenReturn(objQuery);
        when(objQuery.setParameter(anyString(), any())).thenReturn(objQuery);
        when(objQuery.getResultList())
                .thenReturn(
                        List.<Object[]>of(
                                new Object[] {42L, 3L, 5L}, new Object[] {null, null, null}));

        TrainingLessonProgressDaoImpl progressDao = new TrainingLessonProgressDaoImpl(em);
        assertEquals(1, progressDao.upsertProgress(1L, 2L, true, true, 120));

        List<ITrainingLessonProgressDao.LearnerLessonCounts> counts =
                progressDao.countByLearner(List.of(2L));
        assertEquals(2, counts.size());
        assertEquals(42L, counts.get(0).getUserId());
        assertEquals(3L, counts.get(0).getCompleted());
        assertEquals(5L, counts.get(0).getTouched());
        assertNull(counts.get(1).getUserId());
        assertEquals(0L, counts.get(1).getCompleted());
        assertEquals(0L, counts.get(1).getTouched());

        UserTrainingProgressDaoImpl userTrainingDao = new UserTrainingProgressDaoImpl(em);
        assertEquals(1, userTrainingDao.insertIfAbsent(1L, 2L));

        UavTelemetryDaoImpl telemetryDao = new UavTelemetryDaoImpl(em);
        assertTrue(telemetryDao.latestPerUav().isEmpty());
    }

    private boolean hasCollectionParam(Method method) {
        for (Class<?> type : method.getParameterTypes()) {
            if (Collection.class.isAssignableFrom(type)) {
                return true;
            }
        }
        return false;
    }

    private Object[] buildArgs(Method method, boolean emptyCollections) {
        Class<?>[] paramTypes = method.getParameterTypes();
        Type[] genericTypes = method.getGenericParameterTypes();
        Object[] args = new Object[paramTypes.length];
        for (int i = 0; i < paramTypes.length; i++) {
            Object val = sampleValue(paramTypes[i], genericTypes[i], emptyCollections);
            if (val == UNSUPPORTED) {
                return null;
            }
            args[i] = val;
        }
        return args;
    }

    private static final Object UNSUPPORTED = new Object();

    private Object sampleValue(Class<?> raw, Type generic, boolean emptyCollections) {
        if (raw == Long.class || raw == long.class) return 999999L;
        if (raw == Integer.class || raw == int.class) return 5;
        if (raw == Short.class || raw == short.class) return (short) 1;
        if (raw == Double.class || raw == double.class) return 1.0d;
        if (raw == Boolean.class || raw == boolean.class) return Boolean.TRUE;
        if (raw == BigDecimal.class) return BigDecimal.TEN;
        if (raw == String.class) return "probe";
        if (raw == LocalDateTime.class) return LocalDateTime.now();
        if (raw == LocalDate.class) return LocalDate.now();
        if (raw == Instant.class) return Instant.now();
        if (raw == UUID.class) return UUID.randomUUID();
        if (raw == Pageable.class) return PageRequest.of(0, 5, Sort.by("id"));
        if (raw == Sort.class) return Sort.by("id");
        if (raw == HibernateSpecification.class) return HibernateSpecification.unrestricted();
        if (raw.isEnum()) {
            Object[] constants = raw.getEnumConstants();
            return constants.length > 0 ? constants[0] : null;
        }
        if (Set.class.isAssignableFrom(raw)) {
            if (emptyCollections) return Set.of();
            Object elem = sampleCollectionElement(generic);
            return elem == UNSUPPORTED ? UNSUPPORTED : Set.of(elem);
        }
        if (Collection.class.isAssignableFrom(raw)) {
            if (emptyCollections) return List.of();
            Object elem = sampleCollectionElement(generic);
            return elem == UNSUPPORTED ? UNSUPPORTED : List.of(elem);
        }
        return UNSUPPORTED;
    }

    private Object sampleCollectionElement(Type generic) {
        if (generic instanceof ParameterizedType pt) {
            Type arg = pt.getActualTypeArguments()[0];
            if (arg instanceof Class<?> cls) {
                return sampleValue(cls, cls, false);
            }
        }
        return 999999L;
    }
}
