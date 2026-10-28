package com.uav.platform.stabilization;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Reads the newest versioned migration on the classpath, so schema assertions follow new migrations. */
final class MigrationFiles {
    private static final Pattern VERSIONED = Pattern.compile("V(\\d+)__.+\\.sql");

    private MigrationFiles() {}

    static int latestVersion() {
        try {
            Resource[] files =
                    new PathMatchingResourcePatternResolver()
                            .getResources("classpath:db/migration/V*__*.sql");
            return Arrays.stream(files)
                    .map(Resource::getFilename)
                    .filter(Objects::nonNull)
                    .map(VERSIONED::matcher)
                    .filter(Matcher::matches)
                    .mapToInt(m -> Integer.parseInt(m.group(1)))
                    .max()
                    .orElseThrow();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
