package com.uav.platform;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

/** Guards DTO meaning as well as folder spelling; optional packages need real consumers. */
class ModuleDtoStructureTest {
    @Test
    void dtoFilesAreRecordsWithNamesThatMatchTheirRole() throws Exception {
        Path modules = Path.of("src/main/java/com/uav/platform/modules");
        int checked = 0;
        try (var files = Files.walk(modules)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                if (!file.toString().contains("/dto/")) continue;
                String role = file.getParent().getFileName().toString();
                assertTrue(
                        java.util.Set.of("request", "response", "record").contains(role),
                        file.toString());
                String name = file.getFileName().toString().replace(".java", "");
                assertTrue(
                        Files.readString(file).contains("public record " + name), file.toString());
                if (role.equals("request")) assertTrue(name.endsWith("Request"), file.toString());
                if (role.equals("response")) assertTrue(name.endsWith("Response"), file.toString());
                if (role.equals("record")) {
                    assertFalse(
                            name.endsWith("Request") || name.endsWith("Response"),
                            "Internal data must not be confused with HTTP DTOs: " + file);
                }
                checked++;
            }
        }
        assertTrue(checked > 0, "DTO discovery must not silently be empty");
    }
}
