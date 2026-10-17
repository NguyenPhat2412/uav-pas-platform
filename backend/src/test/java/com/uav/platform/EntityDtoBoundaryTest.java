package com.uav.platform;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.source.tree.*;
import com.sun.source.util.JavacTask;

import jakarta.persistence.Entity;

import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

import javax.tools.ToolProvider;

/** Architectural boundaries: JSON contracts cannot expose persistence or internal working data. */
class EntityDtoBoundaryTest {
    @Test
    void entityConstructorsOnlyAssignDataOrDelegateToAnotherConstructor() throws Exception {
        Path source =
                Files.isDirectory(Path.of("src/main/java"))
                        ? Path.of("src/main/java")
                        : Path.of("backend/src/main/java");
        List<Path> entities;
        try (var paths = Files.walk(source.resolve("com/uav/platform/modules"))) {
            entities =
                    paths.filter(
                                    p ->
                                            p.toString().contains("/entity/")
                                                    && p.toString().endsWith(".java"))
                            .toList();
        }
        assertFalse(entities.isEmpty());
        var compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "Architecture verification requires the project's JDK");
        try (var manager = compiler.getStandardFileManager(null, null, null)) {
            var task =
                    (JavacTask)
                            compiler.getTask(
                                    null,
                                    manager,
                                    null,
                                    List.of("-proc:none"),
                                    null,
                                    manager.getJavaFileObjectsFromPaths(entities));
            for (CompilationUnitTree unit : task.parse()) {
                for (Tree declaration : unit.getTypeDecls()) {
                    if (!(declaration instanceof ClassTree type)) continue;
                    for (Tree member : type.getMembers()) {
                        if (!(member instanceof MethodTree constructor)
                                || constructor.getReturnType() != null) continue;
                        Set<String> parameters = new HashSet<>();
                        constructor
                                .getParameters()
                                .forEach(p -> parameters.add(p.getName().toString()));
                        for (StatementTree statement : constructor.getBody().getStatements()) {
                            boolean assignmentOnly = false;
                            if (statement instanceof ExpressionStatementTree expression) {
                                if (expression.getExpression()
                                        instanceof AssignmentTree assignment) {
                                    assignmentOnly =
                                            assignment.getVariable()
                                                            instanceof MemberSelectTree field
                                                    && field.getExpression()
                                                            .toString()
                                                            .equals("this")
                                                    && isDataExpression(
                                                            assignment.getExpression(), parameters);
                                } else if (expression.getExpression()
                                        instanceof MethodInvocationTree delegate) {
                                    assignmentOnly =
                                            delegate.getMethodSelect().toString().equals("this")
                                                    && delegate.getArguments().stream()
                                                            .allMatch(
                                                                    a ->
                                                                            isDataExpression(
                                                                                    a, parameters));
                                }
                            }
                            assertTrue(
                                    assignmentOnly,
                                    "Constructor rules must move to service implementations: "
                                            + unit.getSourceFile().getName()
                                            + " "
                                            + statement);
                        }
                    }
                }
            }
        }
    }

    private boolean isDataExpression(ExpressionTree expression, Set<String> parameters) {
        if (expression instanceof LiteralTree) return true;
        if (expression instanceof IdentifierTree identifier)
            return parameters.contains(identifier.getName().toString());
        // Enum/static constants are data. Reads from another entity, calls and calculations are
        // rules.
        return expression instanceof MemberSelectTree constant
                && constant.getExpression() instanceof IdentifierTree owner
                && !parameters.contains(owner.getName().toString())
                && Character.isUpperCase(owner.getName().charAt(0));
    }

    private List<Class<?>> applicationClasses() throws Exception {
        Path source =
                Files.isDirectory(Path.of("src/main/java"))
                        ? Path.of("src/main/java")
                        : Path.of("backend/src/main/java");
        try (var paths = Files.walk(source.resolve("com/uav/platform"))) {
            List<Class<?>> result = new ArrayList<>();
            for (Path path : paths.filter(p -> p.toString().endsWith(".java")).toList()) {
                String name =
                        source.relativize(path)
                                .toString()
                                .replace('/', '.')
                                .replaceAll("\\.java$", "");
                if (!name.endsWith("package-info"))
                    result.add(Class.forName(name, false, getClass().getClassLoader()));
            }
            return result;
        }
    }

    @Test
    void entityDeclaredMethodsAreOnlyFieldAccessors() throws Exception {
        int entities = 0;
        for (Class<?> type : applicationClasses()) {
            if (!type.isAnnotationPresent(Entity.class)) continue;
            entities++;
            for (Method method : type.getDeclaredMethods()) {
                if (method.isSynthetic()) continue;
                assertFalse(Modifier.isStatic(method.getModifiers()), method.toString());
                boolean accessor = false;
                for (Field field : type.getDeclaredFields()) {
                    String suffix =
                            Character.toUpperCase(field.getName().charAt(0))
                                    + field.getName().substring(1);
                    boolean getterName =
                            method.getName().equals("get" + suffix)
                                    || field.getType() == boolean.class
                                            && method.getName().equals("is" + suffix);
                    accessor |=
                            getterName
                                    && method.getParameterCount() == 0
                                    && method.getReturnType() == field.getType();
                    accessor |=
                            method.getName().equals("set" + suffix)
                                    && method.getReturnType() == void.class
                                    && Arrays.equals(
                                            method.getParameterTypes(),
                                            new Class<?>[] {field.getType()});
                }
                assertTrue(
                        accessor,
                        "Business behavior belongs in service implementations: " + method);
            }
        }
        assertTrue(entities > 0, "Entity discovery must not silently be empty");
    }

    @Test
    void jsonEndpointsUseRequestAndResponseDtos() throws Exception {
        int endpoints = 0;
        for (Class<?> type : applicationClasses()) {
            if (!type.isAnnotationPresent(RestController.class)) continue;
            for (Method method : type.getDeclaredMethods()) {
                if (!AnnotatedElementUtils.hasAnnotation(method, RequestMapping.class)) continue;
                endpoints++;
                assertResponseType(method.getGenericReturnType());
                for (Parameter parameter : method.getParameters()) {
                    if (parameter.isAnnotationPresent(RequestBody.class)) {
                        assertTrue(
                                parameter.getType().getPackageName().endsWith(".dto.request"),
                                "JSON request body must use a request DTO: " + method);
                    }
                }
            }
        }
        assertTrue(endpoints > 0, "Endpoint discovery must not silently be empty");
    }

    private void assertResponseType(Type type) {
        if (type instanceof ParameterizedType parameterized) {
            Class<?> raw = (Class<?>) parameterized.getRawType();
            assertTrue(
                    Set.of(
                                    org.springframework.http.ResponseEntity.class,
                                    List.class,
                                    org.springframework.data.domain.Page.class,
                                    com.uav.platform.common.dto.response.PageResponse.class)
                            .contains(raw),
                    "Unexpected API response wrapper: " + type);
            for (Type argument : parameterized.getActualTypeArguments())
                assertResponseType(argument);
        } else {
            assertInstanceOf(Class.class, type);
            Class<?> raw = (Class<?>) type;
            assertTrue(
                    raw == Void.class
                            || raw == void.class
                            || raw == byte[].class
                            || raw.getPackageName().endsWith(".dto.response"),
                    "API responses must use response DTOs (CSV binary and empty bodies are transport exceptions): "
                            + type);
        }
    }

    @Test
    void recordsHaveAnExplicitDtoRoleIncludingNestedRecords() throws Exception {
        for (Class<?> type : applicationClasses()) assertRecordLocation(type);
    }

    private void assertRecordLocation(Class<?> type) {
        if (type.isRecord())
            assertTrue(
                    type.getPackageName().matches(".*\\.dto\\.(request|response|record)"),
                    "Internal records belong in dto.record: " + type.getName());
        for (Class<?> nested : type.getDeclaredClasses()) assertRecordLocation(nested);
    }
}
