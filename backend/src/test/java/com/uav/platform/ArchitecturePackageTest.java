package com.uav.platform;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Guards the source layout: layers (controller, service, dao, entity, dto, ...) sit beside common
 * and config, each split into one subpackage per feature.
 */
class ArchitecturePackageTest {
    private static final Path MAIN_SOURCE = resolveMainSource();
    private static final Set<String> FEATURE_LAYERS =
            Set.of(
                    "controller",
                    "dao",
                    "dto",
                    "entity",
                    "enums",
                    "mapper",
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
    void controllerMappingsTakeTheirPathsFromApiRoutes() throws IOException {
        Pattern mapping =
                Pattern.compile("@(Get|Post|Put|Patch|Delete|Request)Mapping\\((?<args>[^)]*)\\)");
        List<String> offenders = new ArrayList<>();
        for (Path file : javaFiles(MAIN_SOURCE.resolve("com/uav/platform/controller")).toList()) {
            List<String> lines = Files.readAllLines(file);
            for (int i = 0; i < lines.size(); i++) {
                Matcher found = mapping.matcher(lines.get(i));
                while (found.find()) {
                    String path =
                            found.group("args")
                                    .replaceAll("(produces|consumes)\\s*=\\s*\"[^\"]*\"", "");
                    if (path.contains("\""))
                        offenders.add(
                                MAIN_SOURCE.relativize(file)
                                        + ":"
                                        + (i + 1)
                                        + "  "
                                        + lines.get(i).trim());
                }
            }
        }
        assertTrue(
                offenders.isEmpty(),
                "Use an ApiRoutes constant for these paths:\n" + String.join("\n", offenders));
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
                    ("service".equals(layer) || "dao".equals(layer)) && "impl".equals(parts[4])
                            || "dto".equals(layer);
            assertTrue(
                    parts.length >= (nested ? 7 : 6),
                    "Classes must be inside <layer>/<feature> (service/impl/<feature>, dao/impl/<feature>, dto/<role>/<feature>): "
                            + relative);
            if (name.endsWith("Controller.java")) {
                assertTrue(
                        "controller".equals(layer),
                        "Controllers must be in the controller package: " + relative);
            }
            if (name.endsWith("Dao.java")
                    && !"IGenericDao.java".equals(name)
                    && !"HibernateGenericDao.java".equals(name)) {
                assertTrue(
                        name.startsWith("I") && "dao".equals(layer) && !"impl".equals(parts[4]),
                        "DAO interfaces must follow I*Dao naming in dao/<feature>: " + relative);
                assertTrue(
                        Files.readString(file).contains("extends IGenericDao"),
                        "DAO interfaces must extend IGenericDao: " + relative);
            }
            if (name.endsWith("DaoImpl.java")) {
                assertTrue(
                        "dao".equals(layer) && "impl".equals(parts[4]),
                        "DAO implementations must be in dao/impl/<feature>: " + relative);
                String source = Files.readString(file);
                assertTrue(
                        source.contains("extends HibernateGenericDao"),
                        "DAO implementations must extend HibernateGenericDao: " + relative);
                assertTrue(
                        source.contains("@Repository"),
                        "DAO implementations must be annotated with @Repository: " + relative);
                assertTrue(
                        source.contains("final EntityManager entityManager"),
                        "DAO implementations must inject EntityManager via constructor: "
                                + relative);
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
            Set<String> subpackagedFeatures =
                    Set.of(
                            "mission",
                            "billing",
                            "marketplace",
                            "auth",
                            "user",
                            "storage",
                            "training",
                            "notification");
            String feature = nested ? parts[5] : parts[4];
            if (subpackagedFeatures.contains(feature)
                    && Set.of("controller", "service", "dto", "mapper", "specification")
                            .contains(layer)) {
                assertTrue(
                        parts.length >= (nested ? 8 : 7),
                        "Large domain modules must organize classes into <feature>/<sub-domain> sub-packages: "
                                + relative);
            }
        }
    }

    @Test
    void controllersDependOnServiceContracts() throws IOException {
        for (Path file : javaFiles(MAIN_SOURCE).toList()) {
            if (!file.getFileName().toString().endsWith("Controller.java")) continue;
            String source = Files.readString(file);
            for (String layer :
                    List.of(".service.impl.", ".dao.", ".repository.", ".entity.", ".mapper.")) {
                assertFalse(
                        source.contains(layer),
                        "Controllers must use service contracts and DTOs: " + file);
            }
        }
    }

    @Test
    void persistenceLayerUsesHibernateDaosWithoutSpringDataRepositories() throws IOException {
        assertFalse(
                Files.exists(MAIN_SOURCE.resolve("com/uav/platform/repository")),
                "The legacy Spring Data repository package must be removed in favor of Hibernate DAOs");
        Path pom = MAIN_SOURCE.resolve("../../../pom.xml").normalize();
        if (Files.isRegularFile(pom)) {
            assertFalse(
                    Files.readString(pom).contains("spring-boot-starter-data-jpa"),
                    "pom.xml must not include spring-boot-starter-data-jpa");
        }
        for (Path file : javaFiles(MAIN_SOURCE).toList()) {
            String source = Files.readString(file);
            assertFalse(
                    source.contains("JpaRepository"),
                    "Main sources must not depend on Spring Data JpaRepository: " + file);
            assertFalse(
                    source.contains("org.springframework.data.jpa"),
                    "Main sources must not import Spring Data JPA: " + file);
            assertFalse(
                    source.contains("com.uav.platform.repository"),
                    "Main sources must not reference com.uav.platform.repository: " + file);
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
                        relative.matches("com/uav/platform/mapper/(?:[^/]+/)+[^/]+Mapper\\.java"),
                        "Mappers must be in mapper/<feature>[/<sub-domain>]: " + relative);
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
