package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.repository.training.TrainingLessonProgressRepository;
import com.uav.platform.repository.training.TrainingLessonRepository;
import com.uav.platform.repository.training.UserTrainingProgressRepository;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Training progress SQL against real PostgreSQL: the lesson-progress upsert and the course-record insert under
 * concurrent first saves, the resource count query, and the V35 switch-off of the V34-generated ARTICLE lessons.
 */
@SpringBootTest(
        properties = {
            "app.storage.provider=test",
            "app.jwt.secret=training-progress-test-secret-at-least-32-bytes",
            "spring.sql.init.mode=never"
        })
@TestPropertySource(locations = "file:src/main/resources/application.properties")
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class TrainingProgressPostgresTest {
    private static final String SCHEMA =
            "training_progress_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", () -> System.getenv("UAV_STABILIZATION_DB_URL"));
        p.add("spring.datasource.username", () -> System.getenv("UAV_STABILIZATION_DB_USER"));
        p.add("spring.datasource.password", () -> System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
        p.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        p.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        p.add("spring.flyway.schemas", () -> SCHEMA);
        p.add("spring.flyway.default-schema", () -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        p.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
    }

    @Autowired JdbcTemplate db;
    @Autowired TrainingLessonProgressRepository lessonProgress;
    @Autowired UserTrainingProgressRepository courseProgress;
    @Autowired TrainingLessonRepository lessons;
    @Autowired PlatformTransactionManager transactionManager;

    private long userId;
    private long documentId;
    private long lessonId;

    @BeforeEach
    void fixture() {
        String name = "trn_" + UUID.randomUUID().toString().substring(0, 8);
        userId =
                db.queryForObject(
                        "INSERT INTO users (username, email, role, status, failed_attempts, manual_locked) VALUES (?, ?, 'ROLE_PILOT', 'ACTIVE', 0, false) RETURNING id",
                        Long.class,
                        name,
                        name + "@example.test");
        documentId =
                db.queryForObject(
                        "SELECT id FROM training_documents ORDER BY id LIMIT 1", Long.class);
        lessonId =
                db.queryForObject(
                        "INSERT INTO training_lessons (document_id, title, lesson_type, body_markdown) VALUES (?, 'Bài', 'ARTICLE', 'x') RETURNING id",
                        Long.class,
                        documentId);
    }

    private TransactionTemplate tx() {
        return new TransactionTemplate(transactionManager);
    }

    private Object[] row() {
        return db.queryForObject(
                "SELECT completed_at IS NOT NULL, position_seconds, (SELECT count(*) FROM training_lesson_progress WHERE user_id = ? AND lesson_id = ?) FROM training_lesson_progress WHERE user_id = ? AND lesson_id = ?",
                (rs, i) -> new Object[] {rs.getBoolean(1), rs.getInt(2), rs.getLong(3)},
                userId,
                lessonId,
                userId,
                lessonId);
    }

    @Test
    void upsertNeverClearsCompletionAndOnlyMovesPositionWhenSent() {
        tx().executeWithoutResult(
                        t -> lessonProgress.upsertProgress(userId, lessonId, false, true, 15));
        assertArrayEquals(new Object[] {false, 15, 1L}, row());
        tx().executeWithoutResult(
                        t -> lessonProgress.upsertProgress(userId, lessonId, true, false, 0));
        assertArrayEquals(new Object[] {true, 15, 1L}, row());
        // A later position save with completed=false keeps the completion.
        tx().executeWithoutResult(
                        t -> lessonProgress.upsertProgress(userId, lessonId, false, true, 99));
        assertArrayEquals(new Object[] {true, 99, 1L}, row());
        var counts = lessonProgress.countByLearner(List.of(lessonId));
        assertEquals(1, counts.size());
        assertEquals(1L, counts.get(0).getCompleted());
    }

    @Test
    void concurrentFirstSavesDoNotHitTheUniqueConstraint() throws Exception {
        CountDownLatch firstInserted = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<Void> first =
                CompletableFuture.runAsync(
                        () ->
                                tx().executeWithoutResult(
                                                t -> {
                                                    lessonProgress.upsertProgress(
                                                            userId, lessonId, true, false, 0);
                                                    courseProgress.insertIfAbsent(
                                                            userId, documentId);
                                                    firstInserted.countDown();
                                                    await(release);
                                                }));
        assertTrue(firstInserted.await(10, TimeUnit.SECONDS));
        // The second save starts while the first one's rows are still uncommitted and waits on
        // them.
        CompletableFuture<Void> second =
                CompletableFuture.runAsync(
                        () ->
                                tx().executeWithoutResult(
                                                t -> {
                                                    lessonProgress.upsertProgress(
                                                            userId, lessonId, false, true, 30);
                                                    courseProgress.insertIfAbsent(
                                                            userId, documentId);
                                                }));
        Thread.sleep(300);
        assertFalse(second.isDone(), "the second save must wait for the first one's row");
        release.countDown();
        first.get(10, TimeUnit.SECONDS);
        second.get(10, TimeUnit.SECONDS);

        assertArrayEquals(new Object[] {true, 30, 1L}, row());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM user_training_progress WHERE user_id = ? AND document_id = ?",
                        Integer.class,
                        userId,
                        documentId));
        assertTrue(courseProgress.findByUserIdAndDocumentId(userId, documentId).isPresent());
    }

    @Test
    void resourceCountsAreGroupedPerLesson() {
        long asset =
                db.queryForObject(
                        "INSERT INTO training_assets (object_key, file_name, content_type, size_bytes, status) VALUES (?, 'a.pdf', 'application/pdf', 10, 'READY') RETURNING id",
                        Long.class,
                        "training/" + UUID.randomUUID());
        db.update(
                "INSERT INTO training_lesson_resources (lesson_id, sort_order, asset_id, title) VALUES (?, 0, ?, 'a'), (?, 1, ?, 'b')",
                lessonId,
                asset,
                lessonId,
                asset);
        List<Object[]> rows = lessons.countResources(List.of(lessonId, -1L));
        assertEquals(1, rows.size());
        assertEquals(lessonId, ((Number) rows.get(0)[0]).longValue());
        assertEquals(2, ((Number) rows.get(0)[1]).intValue());
    }

    @Test
    void freshDatabaseHasNoActiveGeneratedArticlesButKeepsTheRows() {
        int documents = db.queryForObject("SELECT count(*) FROM training_documents", Integer.class);
        assertTrue(documents > 0);
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT count(*) FROM training_lessons WHERE active AND section_title = 'Nội dung' AND sort_order = 10",
                        Integer.class));
        assertEquals(
                documents,
                db.queryForObject(
                        "SELECT count(*) FROM training_lessons WHERE NOT active AND lesson_type = 'ARTICLE'",
                        Integer.class));
        assertNull(
                db.queryForObject(
                        "SELECT document_url FROM training_lessons WHERE id = ?",
                        String.class,
                        lessonId));
    }

    @Test
    void v35SwitchesOffOnlyTheV34GeneratedArticles() throws Exception {
        String schema = "training_v35_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection c = connection();
                Statement s = c.createStatement()) {
            migrate(schema, MigrationVersion.fromVersion("34"));
            s.execute("SET search_path TO " + schema);
            int generated = count(s, "SELECT count(*) FROM training_lessons WHERE active");
            assertTrue(generated > 0);
            // An administrator edited one generated lesson's text, and later added their own
            // article,
            // a video and a short text lesson in the default section.
            s.executeUpdate(
                    "UPDATE training_lessons SET body_markdown = 'đã sửa', updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT MIN(id) FROM training_lessons)");
            s.executeUpdate(
                    "INSERT INTO training_lessons (document_id, section_title, title, lesson_type, sort_order, body_markdown, created_at) SELECT id, 'Bắt đầu', 'Bài viết', 'ARTICLE', 20, 'Nội dung tự viết', CURRENT_TIMESTAMP + interval '1 minute' FROM training_documents ORDER BY id LIMIT 1");
            s.executeUpdate(
                    "INSERT INTO training_lessons (document_id, title, lesson_type, sort_order, video_url, created_at) SELECT id, 'Video', 'VIDEO', 10, 'https://youtu.be/dQw4w9WgXcQ', CURRENT_TIMESTAMP + interval '1 minute' FROM training_documents ORDER BY id LIMIT 1");
            s.executeUpdate(
                    "INSERT INTO training_lessons (document_id, section_title, title, lesson_type, sort_order, body_markdown, created_at) SELECT id, 'Nội dung', 'Ghi chú', 'ARTICLE', 10, 'Ghi chú riêng', CURRENT_TIMESTAMP + interval '1 minute' FROM training_documents ORDER BY id LIMIT 1");

            migrate(schema, MigrationVersion.fromVersion("35"));
            assertEquals(
                    generated,
                    count(
                            s,
                            "SELECT count(*) FROM training_lessons WHERE NOT active AND lesson_type = 'ARTICLE'"));
            assertEquals(3, count(s, "SELECT count(*) FROM training_lessons WHERE active"));
            assertEquals(generated + 3, count(s, "SELECT count(*) FROM training_lessons"));
            assertEquals(
                    1,
                    count(
                            s,
                            "SELECT count(*) FROM information_schema.columns WHERE table_schema = '"
                                    + schema
                                    + "' AND table_name = 'training_lessons' AND column_name = 'document_url'"));
        } finally {
            try (Connection c = connection();
                    Statement s = c.createStatement()) {
                s.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    private static int count(Statement s, String sql) throws Exception {
        try (ResultSet r = s.executeQuery(sql)) {
            assertTrue(r.next());
            return r.getInt(1);
        }
    }

    private static void migrate(String schema, MigrationVersion target) {
        Flyway.configure()
                .dataSource(
                        System.getenv("UAV_STABILIZATION_DB_URL"),
                        System.getenv("UAV_STABILIZATION_DB_USER"),
                        System.getenv("UAV_STABILIZATION_DB_PASSWORD"))
                .locations("classpath:db/migration")
                .schemas(schema)
                .defaultSchema(schema)
                .createSchemas(true)
                .target(target)
                .load()
                .migrate();
    }

    private static Connection connection() throws Exception {
        return DriverManager.getConnection(
                System.getenv("UAV_STABILIZATION_DB_URL"),
                System.getenv("UAV_STABILIZATION_DB_USER"),
                System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
    }

    private static void await(CountDownLatch latch) {
        try {
            assertTrue(latch.await(10, TimeUnit.SECONDS));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }
}
