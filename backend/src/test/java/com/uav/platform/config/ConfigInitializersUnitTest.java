package com.uav.platform.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.IUiTranslationDao;
import com.uav.platform.entity.UiTranslation;
import com.uav.platform.service.UiTranslationService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.List;

import javax.sql.DataSource;

class ConfigInitializersUnitTest {

    @Test
    @SuppressWarnings("unchecked")
    void uiTranslationInitializerSeedsMissingKeysAndInvalidatesCacheIdempotently() {
        IUiTranslationDao dao = mock(IUiTranslationDao.class);
        UiTranslationService service = mock(UiTranslationService.class);
        UiTranslationDataInitializer initializer = new UiTranslationDataInitializer(dao, service);

        when(dao.findByLocaleOrderByTranslationKeyAsc(anyString())).thenReturn(List.of());
        initializer.run(new DefaultApplicationArguments());

        ArgumentCaptor<List<UiTranslation>> savedBatches = ArgumentCaptor.forClass(List.class);
        verify(dao, atLeastOnce()).saveAll(savedBatches.capture());
        verify(service, times(1)).invalidateCache();

        List<UiTranslation> allSaved =
                savedBatches.getAllValues().stream().flatMap(List::stream).toList();
        assertFalse(allSaved.isEmpty());
        assertTrue(allSaved.stream().allMatch(t -> "SYSTEM".equals(t.getUpdatedBy())));

        // Re-running when all keys already exist inserts nothing and does not invalidate cache
        reset(dao, service);
        when(dao.findByLocaleOrderByTranslationKeyAsc("vi"))
                .thenReturn(allSaved.stream().filter(t -> "vi".equals(t.getLocale())).toList());
        when(dao.findByLocaleOrderByTranslationKeyAsc("en"))
                .thenReturn(allSaved.stream().filter(t -> "en".equals(t.getLocale())).toList());
        when(dao.findByLocaleOrderByTranslationKeyAsc("ja"))
                .thenReturn(allSaved.stream().filter(t -> "ja".equals(t.getLocale())).toList());

        initializer.run(new DefaultApplicationArguments());
        verify(dao, never()).saveAll(anyList());
        verify(service, never()).invalidateCache();

        // Repository exception is caught and logged gracefully without aborting startup
        reset(dao, service);
        when(dao.findByLocaleOrderByTranslationKeyAsc(anyString()))
                .thenThrow(new IllegalStateException("db unavailable"));
        assertDoesNotThrow(() -> initializer.run(new DefaultApplicationArguments()));
        verify(service, never()).invalidateCache();
    }

    @Test
    void phase1SchemaInitializerUpdatesConstraintOnPostgresAndSkipsOnH2() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(jdbc.getDataSource()).thenReturn(dataSource);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);

        Phase1SchemaInitializer initializer = new Phase1SchemaInitializer(jdbc);

        // PostgreSQL path: drops and recreates permissions_code_check constraint
        when(metadata.getDatabaseProductName()).thenReturn("PostgreSQL");
        initializer.run(new DefaultApplicationArguments());
        verify(jdbc).execute(contains("manual_locked"));
        verify(jdbc).execute(contains("drop constraint if exists permissions_code_check"));
        verify(jdbc).execute(contains("add constraint permissions_code_check"));

        // Non-PostgreSQL (H2) path: only adds column, skips constraint rewrite
        reset(jdbc);
        when(jdbc.getDataSource()).thenReturn(dataSource);
        when(metadata.getDatabaseProductName()).thenReturn("H2");
        initializer.run(new DefaultApplicationArguments());
        verify(jdbc, times(1)).execute(anyString());

        // SQLException from metadata inspection is wrapped and swallowed cleanly
        reset(jdbc);
        when(jdbc.getDataSource()).thenReturn(dataSource);
        when(dataSource.getConnection()).thenThrow(new SQLException("boom"));
        assertDoesNotThrow(() -> initializer.run(new DefaultApplicationArguments()));
    }
}
