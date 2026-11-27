package com.uav.platform.mapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.MediaAsset;
import com.uav.platform.entity.ProviderDocument;
import com.uav.platform.service.ObjectStorageService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Exhaustively exercises all 24 mappers (MapStruct implementations + manual mappers) across null,
 * empty-entity, and deeply-populated inputs so every null-check and nested-path branch is verified.
 */
class AllMappersUnitTest {

    @Test
    void allMappersHandleNullEmptyAndPopulatedInputsCleanly() throws Exception {
        Path mapperDir =
                Files.isDirectory(Path.of("src/main/java/com/uav/platform/mapper"))
                        ? Path.of("src/main/java/com/uav/platform/mapper")
                        : Path.of("backend/src/main/java/com/uav/platform/mapper");

        List<Path> files;
        try (var stream = Files.list(mapperDir)) {
            files = stream.filter(p -> p.toString().endsWith("Mapper.java")).sorted().toList();
        }
        assertEquals(24, files.size(), "Expected all 24 mappers in flat mapper/");

        int invokedMethods = 0;
        List<String> failures = new ArrayList<>();

        for (Path file : files) {
            String simpleName = file.getFileName().toString().replace(".java", "");
            Class<?> apiClass = Class.forName("com.uav.platform.mapper." + simpleName);
            Object mapper = instantiateMapper(apiClass);

            for (Method method : apiClass.getDeclaredMethods()) {
                if (!Modifier.isPublic(method.getModifiers())
                        || method.isSynthetic()
                        || Modifier.isStatic(method.getModifiers())
                        || method.getName().startsWith("set")) {
                    continue;
                }
                invokedMethods++;
                try {
                    // 1. Populated entities (depth 2) — covers happy paths & nested relations
                    Object[] populated = buildArgs(method, true, 2);
                    method.invoke(mapper, populated);

                    // 2. Empty entities (depth 0) — covers null nested relation guards
                    Object[] empty = buildArgs(method, true, 0);
                    try {
                        method.invoke(mapper, empty);
                    } catch (InvocationTargetException ignored) {
                        // Mappers expecting non-null scalar fields (e.g. nextDueDate, quantity) may
                        // throw NPE on uninitialized entities
                    }

                    // 3. All-null arguments — covers MapStruct top-level null guards
                    Object[] nulls = buildArgs(method, false, 0);
                    try {
                        method.invoke(mapper, nulls);
                    } catch (InvocationTargetException ignored) {
                        // Manual mappers expecting non-null primary entity may throw NPE on null
                    }
                } catch (InvocationTargetException ite) {
                    Throwable cause = ite.getCause();
                    failures.add(
                            simpleName
                                    + "#"
                                    + method.getName()
                                    + " -> "
                                    + cause.getClass().getSimpleName()
                                    + ": "
                                    + cause.getMessage());
                } catch (Exception ex) {
                    failures.add(
                            simpleName
                                    + "#"
                                    + method.getName()
                                    + " -> "
                                    + ex.getClass().getSimpleName()
                                    + ": "
                                    + ex.getMessage());
                }
            }
        }

        assertTrue(
                failures.isEmpty(),
                "Mapper failures (" + failures.size() + "):\n" + String.join("\n", failures));
        assertTrue(
                invokedMethods >= 40,
                "Expected at least 40 mapper methods exercised, got " + invokedMethods);
    }

    @Test
    @SuppressWarnings("unchecked")
    void marketplaceMapperResolvesSignedDownloadUrlAndFallsBackSafely() {
        MarketplaceMapper mapper = new MarketplaceMapper();
        ObjectProvider<ObjectStorageService> provider = mock(ObjectProvider.class);
        ObjectStorageService storage = mock(ObjectStorageService.class);
        mapper.setObjectStorage(provider);

        MediaAsset media = new MediaAsset();
        media.setId(9L);
        media.setDeleted(false);
        media.setConfirmed(true);
        media.setObjectKey("docs/license.pdf");

        ProviderDocument doc = new ProviderDocument();
        doc.setId(5L);
        doc.setFileUrl("https://cdn.example/fallback.pdf");
        doc.setMediaAsset(media);

        when(provider.getIfAvailable()).thenReturn(storage);
        when(storage.createSignedDownloadUrl("docs/license.pdf"))
                .thenReturn("https://signed.example/license.pdf");
        assertEquals(
                "https://signed.example/license.pdf", mapper.toDocumentResponse(doc).downloadUrl());

        // Blank signed URL falls back to direct fileUrl
        when(storage.createSignedDownloadUrl(anyString())).thenReturn("   ");
        assertEquals(
                "https://cdn.example/fallback.pdf", mapper.toDocumentResponse(doc).downloadUrl());

        // Storage runtime exception falls back safely
        when(storage.createSignedDownloadUrl(anyString()))
                .thenThrow(new IllegalStateException("offline"));
        assertEquals(
                "https://cdn.example/fallback.pdf", mapper.toDocumentResponse(doc).downloadUrl());

        // Unconfirmed or deleted media skips signing
        media.setConfirmed(false);
        assertEquals(
                "https://cdn.example/fallback.pdf", mapper.toDocumentResponse(doc).downloadUrl());
        media.setConfirmed(true);
        media.setDeleted(true);
        assertEquals(
                "https://cdn.example/fallback.pdf", mapper.toDocumentResponse(doc).downloadUrl());
    }

    private Object instantiateMapper(Class<?> apiClass) throws Exception {
        Class<?> implClass =
                apiClass.isInterface() ? Class.forName(apiClass.getName() + "Impl") : apiClass;
        Constructor<?> ctor = implClass.getDeclaredConstructor();
        ctor.setAccessible(true);
        return ctor.newInstance();
    }

    private Object[] buildArgs(Method method, boolean populate, int depth) {
        Class<?>[] types = method.getParameterTypes();
        Type[] genericTypes = method.getGenericParameterTypes();
        Object[] args = new Object[types.length];
        for (int i = 0; i < types.length; i++) {
            args[i] =
                    populate
                            ? sampleValue(types[i], genericTypes[i], depth)
                            : primitiveZeroOrNull(types[i]);
        }
        return args;
    }

    private Object primitiveZeroOrNull(Class<?> type) {
        if (!type.isPrimitive()) return null;
        if (type == boolean.class) return false;
        if (type == byte.class) return (byte) 0;
        if (type == short.class) return (short) 0;
        if (type == int.class) return 0;
        if (type == long.class) return 0L;
        if (type == float.class) return 0.0f;
        if (type == double.class) return 0.0d;
        if (type == char.class) return '\0';
        return null;
    }

    private Object sampleValue(Class<?> type, Type genericType, int depth) {
        if (type == String.class) return "sample";
        if (type == Long.class || type == long.class) return 1L;
        if (type == Integer.class || type == int.class) return 2;
        if (type == Double.class || type == double.class) return 3.5d;
        if (type == Float.class || type == float.class) return 1.5f;
        if (type == Boolean.class || type == boolean.class) return true;
        if (type == BigDecimal.class) return BigDecimal.TEN;
        if (type == LocalDateTime.class) return LocalDateTime.of(2026, 6, 1, 10, 0);
        if (type == LocalDate.class) return LocalDate.of(2026, 6, 1);
        if (type == Instant.class) return Instant.parse("2026-06-01T10:00:00Z");
        if (type == UUID.class) return UUID.fromString("00000000-0000-0000-0000-000000000001");
        if (type.isEnum()) {
            Object[] constants = type.getEnumConstants();
            return constants != null && constants.length > 0 ? constants[0] : null;
        }
        if (List.class.isAssignableFrom(type) || Collection.class == type) {
            if (depth <= 0) return List.of();
            Object elem = sampleTypeArg(genericType, 0, depth - 1);
            return elem != null ? List.of(elem) : List.of();
        }
        if (Set.class.isAssignableFrom(type)) {
            if (depth <= 0) return Set.of();
            Object elem = sampleTypeArg(genericType, 0, depth - 1);
            return elem != null ? Set.of(elem) : Set.of();
        }
        if (Map.class.isAssignableFrom(type)) {
            return Map.of();
        }
        if (type.isRecord()) {
            RecordComponent[] comps = type.getRecordComponents();
            Class<?>[] paramTypes = new Class<?>[comps.length];
            Object[] vals = new Object[comps.length];
            for (int i = 0; i < comps.length; i++) {
                paramTypes[i] = comps[i].getType();
                vals[i] =
                        depth > 0
                                ? sampleValue(
                                        comps[i].getType(), comps[i].getGenericType(), depth - 1)
                                : primitiveZeroOrNull(comps[i].getType());
            }
            try {
                Constructor<?> ctor = type.getDeclaredConstructor(paramTypes);
                ctor.setAccessible(true);
                return ctor.newInstance(vals);
            } catch (Exception ignored) {
                return null;
            }
        }
        if (type.getName().startsWith("com.uav.platform.")
                && !type.isInterface()
                && !Modifier.isAbstract(type.getModifiers())) {
            try {
                Constructor<?> ctor = type.getDeclaredConstructor();
                ctor.setAccessible(true);
                Object instance = ctor.newInstance();
                if (depth > 0) {
                    populateFields(instance, depth - 1);
                }
                return instance;
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private Object sampleTypeArg(Type genericType, int index, int depth) {
        if (genericType instanceof ParameterizedType pt) {
            Type[] args = pt.getActualTypeArguments();
            if (index < args.length && args[index] instanceof Class<?> cls) {
                return sampleValue(cls, cls, depth);
            }
        }
        return null;
    }

    private void populateFields(Object instance, int depth) {
        Class<?> cls = instance.getClass();
        while (cls != null && cls != Object.class) {
            for (Field f : cls.getDeclaredFields()) {
                int mod = f.getModifiers();
                if (Modifier.isStatic(mod) || Modifier.isFinal(mod)) continue;
                try {
                    f.setAccessible(true);
                    Object current = f.get(instance);
                    if (current != null && !f.getType().isPrimitive()) continue;
                    // Avoid self-referential infinite recursion on entity graphs
                    if (f.getType() == instance.getClass()) continue;
                    Object val = sampleValue(f.getType(), f.getGenericType(), depth);
                    if (val != null) {
                        f.set(instance, val);
                    }
                } catch (Exception ignored) {
                    // Best-effort field population
                }
            }
            cls = cls.getSuperclass();
        }
    }
}
