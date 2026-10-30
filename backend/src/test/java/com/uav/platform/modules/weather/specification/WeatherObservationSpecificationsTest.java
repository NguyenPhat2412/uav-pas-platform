package com.uav.platform.modules.weather.specification;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.modules.weather.entity.WeatherObservationCache;
import com.uav.platform.modules.weather.entity.WeatherProviderSettings;
import com.uav.platform.modules.weather.enums.WeatherProviderType;
import com.uav.platform.modules.weather.repository.WeatherObservationCacheRepository;
import com.uav.platform.modules.weather.repository.WeatherProviderSettingsRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** DAO layer on the H2 test database: derived queries, specifications and expiry cleanup. */
@SpringBootTest
@Transactional
class WeatherObservationSpecificationsTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 31, 8, 0);

    @Autowired private WeatherObservationCacheRepository cache;
    @Autowired private WeatherProviderSettingsRepository settings;

    @BeforeEach
    void seed() {
        cache.deleteAll();
        cache.save(
                new WeatherObservationCache(
                        21.03, 105.85, "2026-10-31T08:00", "OPEN_METEO", "[]", 2.0, NOW));
        cache.save(
                new WeatherObservationCache(
                        21.04,
                        105.86,
                        "2026-10-31T08:00",
                        "OPENWEATHERMAP",
                        "[]",
                        null,
                        NOW.minusHours(3)));
        cache.save(
                new WeatherObservationCache(
                        10.77,
                        106.70,
                        "2026-10-31T09:00",
                        "OPEN_METEO",
                        "[]",
                        3.0,
                        NOW.minusDays(3)));
    }

    @Test
    void findsOneCellByItsNaturalKey() {
        var row =
                cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                        21.03, 105.85, "2026-10-31T08:00", "OPEN_METEO");
        assertTrue(row.isPresent());
        assertEquals(2.0, row.get().getKpIndex());
        assertNotNull(row.get().getCreatedAt());
        assertTrue(
                cache.findByGridLatAndGridLngAndTargetHourAndProvider(
                                21.03, 105.85, "2026-10-31T09:00", "OPEN_METEO")
                        .isEmpty());
    }

    @Test
    void filtersByGridProviderAndFreshness() {
        List<WeatherObservationCache> near =
                cache.findAll(WeatherObservationSpecifications.withinGrid(21.03, 105.85, 0.02));
        assertEquals(2, near.size());
        assertEquals(
                1,
                cache.findAll(WeatherObservationSpecifications.withinGrid(10.77, 106.70, 0.001))
                        .size());
        assertEquals(
                2, cache.findAll(WeatherObservationSpecifications.byProvider("OPEN_METEO")).size());
        assertEquals(3, cache.findAll(WeatherObservationSpecifications.byProvider(" ")).size());
        assertEquals(3, cache.findAll(WeatherObservationSpecifications.byProvider(null)).size());
        assertEquals(
                2,
                cache.findAll(WeatherObservationSpecifications.fetchedAfter(NOW.minusDays(1)))
                        .size());
        assertEquals(3, cache.findAll(WeatherObservationSpecifications.fetchedAfter(null)).size());
        Specification<WeatherObservationCache> combined =
                WeatherObservationSpecifications.withinGrid(21.03, 105.85, 0.05)
                        .and(WeatherObservationSpecifications.byProvider("OPEN_METEO"))
                        .and(WeatherObservationSpecifications.fetchedAfter(NOW.minusHours(1)));
        assertEquals(1, cache.findAll(combined).size());
    }

    @Test
    void deletesExpiredRows() {
        assertEquals(1, cache.deleteByFetchedAtBefore(NOW.minusDays(2)));
        assertEquals(2, cache.count());
        assertEquals(0, cache.deleteByFetchedAtBefore(NOW.minusDays(2)));
    }

    @Test
    void storesTheSingleProviderSettingsRow() {
        WeatherProviderSettings row = new WeatherProviderSettings();
        row.setProvider(WeatherProviderType.OPENWEATHERMAP);
        row.setApiKeyCipher("sealed");
        row.setCacheTtlMinutes(15);
        row.setEnforcePreflightBlock(true);
        row.setUpdatedAt(NOW);
        row.setUpdatedBy("admin");
        settings.save(row);
        WeatherProviderSettings loaded = settings.findById(1).orElseThrow();
        assertEquals(1, loaded.getId());
        assertEquals(WeatherProviderType.OPENWEATHERMAP, loaded.getProvider());
        assertEquals("sealed", loaded.getApiKeyCipher());
        assertEquals(15, loaded.getCacheTtlMinutes());
        assertTrue(loaded.isEnforcePreflightBlock());
        assertEquals("admin", loaded.getUpdatedBy());
        assertEquals(NOW, loaded.getUpdatedAt());
    }
}
