package com.uav.platform.config;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;

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
