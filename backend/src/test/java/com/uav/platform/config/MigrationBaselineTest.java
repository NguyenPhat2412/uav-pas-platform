package com.uav.platform.config;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

class MigrationBaselineTest {
    @Test
    void baselineIncludesPhaseOneAndExistingMissionTables() throws Exception {
        Path migration = Path.of("src/main/resources/db/migration/V1__baseline_uav_pas.sql");
        String sql = Files.readString(migration);
        for (String table :
                new String[] {
                    "users",
                    "uav_stations",
                    "uavs",
                    "equipment",
                    "media_assets",
                    "audit_logs",
                    "missions",
                    "mission_events",
                    "mission_media",
                    "mission_equipment_reservations"
                }) {
            assertTrue(sql.contains("create table " + table), "missing baseline table: " + table);
        }
    }
}
