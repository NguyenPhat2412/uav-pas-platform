package com.uav.platform;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Guards the source layout: layers (controller, service, repository, entity, dto, ...) sit beside
 * common and config, each split into one subpackage per feature.
 */
class ArchitecturePackageTest {
    private static final Path MAIN_SOURCE = resolveMainSource();
    private static final Set<String> FEATURE_LAYERS =
            Set.of(
                    "controller",
                    "dto",
                    "entity",
                    "enums",
                    "mapper",
                    "repository",
                    "service",
                    "specification",
                    "transport");

    @Test
    void platformRootAndLegacyPackageAreConsistent() throws IOException {
        Path application = MAIN_SOURCE.resolve("com/uav/platform/UavPlatformApplication.java");
        assertTrue(
                Files.isRegularFile(application),
                "The Spring Boot entry point must be in com.uav.platform");
        assertTrue(
                Files.readString(application).contains("package com.uav.platform;"),
                "The Spring Boot entry point must declare com.uav.platform");
        assertFalse(
                Files.exists(MAIN_SOURCE.resolve("com/uav_pass/local")),
                "The legacy com.uav_pass.local package must be removed");
        assertFalse(
                javaFiles(MAIN_SOURCE).anyMatch(this::containsLegacyPackage),
                "Main sources must not reference com.uav_pass.local");
    }

    @Test
    void layersSitBesideCommonAndConfigWithFeatureSubpackages() throws IOException {
        assertFalse(
                Files.exists(MAIN_SOURCE.resolve("com/uav/platform/modules")),
                "Layers live at com.uav.platform.<layer>.<feature>; the modules package is retired");
        List<Path> files = javaFiles(MAIN_SOURCE).toList();
        for (Path file : files) {
            String relative =
                    MAIN_SOURCE
                            .relativize(file)
                            .toString()
                            .replace(file.getFileSystem().getSeparator(), "/");
            String expectedPackage =
                    relative.substring(0, relative.lastIndexOf('/')).replace('/', '.');
            assertTrue(
                    Files.readString(file).contains("package " + expectedPackage + ";"),
                    "Package declaration must match the source path: " + relative);
            String[] parts = relative.split("/");
            if (parts.length < 4
                    || !"com".equals(parts[0])
                    || !"uav".equals(parts[1])
                    || !"platform".equals(parts[2])) {
                continue;
            }
            String layer = parts[3];
            if (!FEATURE_LAYERS.contains(layer)) {
                continue;
            }
            String name = file.getFileName().toString();
            boolean nested =
                    "service".equals(layer) && "impl".equals(parts[4]) || "dto".equals(layer);
            assertTrue(
                    parts.length >= (nested ? 7 : 6),
                    "Classes must be inside <layer>/<feature> (service/impl/<feature>, dto/<role>/<feature>): "
                            + relative);
            if (name.endsWith("Controller.java")) {
                assertTrue(
                        "controller".equals(layer),
                        "Controllers must be in the controller package: " + relative);
            }
            if (name.endsWith("Repository.java")) {
                assertTrue(
                        "repository".equals(layer),
                        "Repositories must be in the repository package: " + relative);
                assertTrue(
                        Files.readString(file).contains("JpaSpecificationExecutor"),
                        "Repositories must expose specification support: " + relative);
            }
            if (name.endsWith("Specifications.java")) {
                assertTrue(
                        "specification".equals(layer),
                        "Specifications must be in the specification package: " + relative);
            }
            if ("service".equals(layer) && "impl".equals(parts[4])) {
                assertTrue(
                        name.endsWith("ServiceImpl.java")
                                || name.endsWith("Operations.java")
                                || "UserAccountPersistenceListener.java".equals(name)
                                || "S3CompatibleStorageService.java".equals(name),
                        "Service implementations must use ServiceImpl, Operations, or an explicit framework adapter: "
                                + relative);
            }
            if ("dto".equals(layer)) {
                assertTrue(
                        Set.of("request", "response", "record").contains(parts[4]),
                        "DTOs must be in dto/request, dto/response or dto/record: " + relative);
            }
            if (Files.readString(file).matches("(?s).*public enum \\w+.*")) {
                assertTrue(
                        "enums".equals(layer),
                        "Domain enums must be in the enums package: " + relative);
            }
        }
    }

    @Test
    void controllersDependOnServiceContracts() throws IOException {
        for (Path file : javaFiles(MAIN_SOURCE).toList()) {
            if (!file.getFileName().toString().endsWith("Controller.java")) continue;
            String source = Files.readString(file);
            for (String layer : List.of(".service.impl.", ".repository.", ".entity.", ".mapper.")) {
                assertFalse(
                        source.contains(layer),
                        "Controllers must use service contracts and DTOs: " + file);
            }
        }
    }

    @Test
    void mappersRemainOutsideEntitiesAndDtos() throws IOException {
        for (Path file : javaFiles(MAIN_SOURCE).toList()) {
            String relative =
                    MAIN_SOURCE
                            .relativize(file)
                            .toString()
                            .replace(file.getFileSystem().getSeparator(), "/");
            boolean entityOrDto =
                    relative.startsWith("com/uav/platform/entity/")
                            || relative.startsWith("com/uav/platform/dto/");
            if (entityOrDto) {
                assertFalse(
                        Files.readString(file).contains("import com.uav.platform.mapper."),
                        "Entities and DTOs must not depend on mapper classes: " + relative);
            }
            if (file.getFileName().toString().endsWith("Mapper.java")) {
                assertTrue(
                        relative.matches("com/uav/platform/mapper/[^/]+/[^/]+Mapper\\.java"),
                        "Mappers must be in mapper/<feature>: " + relative);
            }
            if (file.getFileName().toString().endsWith("Controller.java")) {
                assertFalse(
                        Files.readString(file)
                                .matches(
                                        "(?s).*import\\s+com\\.uav\\.platform\\.entity\\.[^;]+;.*"),
                        "Controllers must only use Request/Response DTOs and must not directly import JPA Entities: "
                                + relative);
            }
        }
    }

    private Stream<Path> javaFiles(Path root) throws IOException {
        return Files.walk(root)
                .filter(path -> Files.isRegularFile(path) && path.toString().endsWith(".java"));
    }

    private static Path resolveMainSource() {
        Path moduleSource = Path.of("src/main/java");
        return Files.isDirectory(moduleSource) ? moduleSource : Path.of("backend/src/main/java");
    }

    private boolean containsLegacyPackage(Path path) {
        try {
            return Files.readString(path).contains("com.uav_pass.local");
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to inspect " + path, exception);
        }
    }
}
