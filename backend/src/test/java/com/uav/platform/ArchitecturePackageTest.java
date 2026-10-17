package com.uav.platform;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

/**
 * Guards the source layout so a future change cannot silently reintroduce the
 * legacy package or bypass the module boundaries established by the migration.
 */
class ArchitecturePackageTest {
    private static final Path MAIN_SOURCE = resolveMainSource();

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
    void moduleBoundariesUseTheDeclaredFeaturePackages() throws IOException {
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
            if ("modules".equals(parts[3])) {
                assertTrue(
                        parts.length >= 6,
                        "Module classes must be inside modules/<feature>/<layer>: " + relative);
                String layer = parts[5];
                if (file.getFileName().toString().endsWith("Controller.java")) {
                    assertTrue(
                            "controller".equals(layer),
                            "Controllers must be in a controller package: " + relative);
                }
                if (file.getFileName().toString().endsWith("Repository.java")) {
                    assertTrue(
                            "repository".equals(layer),
                            "Repositories must be in a repository package: " + relative);
                    assertTrue(
                            Files.readString(file).contains("JpaSpecificationExecutor"),
                            "Repositories must expose specification support: " + relative);
                }
                if (file.getFileName().toString().endsWith("Specifications.java")) {
                    assertTrue(
                            "specification".equals(layer),
                            "Specifications must be in a specification package: " + relative);
                }
                if ("service".equals(layer) && parts.length >= 7 && "impl".equals(parts[6])) {
                    String name = file.getFileName().toString();
                    assertTrue(
                            name.endsWith("ServiceImpl.java")
                                    || name.endsWith("Operations.java")
                                    || "UserAccountPersistenceListener.java".equals(name)
                                    || "S3CompatibleStorageService.java".equals(name),
                            "Service implementations must use ServiceImpl, Operations, or an explicit framework adapter: "
                                    + relative);
                }
                assertFalse(
                        relative.matches(".*/modules/[^/]+/config/(request|response)/.*"),
                        "Module DTOs must be in dto/request or dto/response: " + relative);
                if (Files.readString(file).matches("(?s).*public enum \\w+.*")) {
                    assertTrue(
                            "enums".equals(layer),
                            "Domain enums must be in an enums package: " + relative);
                }
                assertFalse(
                        relative.matches(".*/repository/specification/.*"),
                        "Specifications must not be nested under repository: " + relative);
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
            boolean moduleEntityOrDto =
                    relative.contains("/modules/")
                            && (relative.contains("/entity/")
                                    || relative.contains("/dto/request/")
                                    || relative.contains("/dto/response/")
                                    || relative.contains("/dto/record/"));
            if (moduleEntityOrDto) {
                assertFalse(
                        Files.readString(file)
                                .contains(
                                        "import com.uav.platform.modules."
                                                + relative.split("/modules/")[1].split("/")[0]
                                                + ".mapper."),
                        "Entities and DTOs must not depend on mapper classes: " + relative);
            }
            if (file.getFileName().toString().endsWith("Mapper.java")) {
                assertTrue(
                        relative.matches(".*/modules/[^/]+/mapper/[^/]+Mapper\\.java"),
                        "Mappers must be in a module mapper package: " + relative);
            }
            if (file.getFileName().toString().endsWith("Controller.java")) {
                assertFalse(
                        Files.readString(file)
                                .matches(
                                        "(?s).*import\\s+com\\.uav\\.platform\\.modules\\.[^;]+\\.entity\\.[^;]+;.*"),
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
