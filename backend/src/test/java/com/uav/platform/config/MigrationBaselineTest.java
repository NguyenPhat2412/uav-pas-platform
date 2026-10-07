package com.uav.platform.config;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

class MigrationBaselineTest {
    @Test
    void baselineIncludesPhaseOneAndExistingMissionTables() throws Exception {
        Path migration = Path.of("src/main/resources/db/migration/V1__baseline_uav_pas.sql");
        String sql = Files.readString(migration);
        for (String table : new String[]{"users", "uav_stations", "uavs", "equipment", "media_assets", "audit_logs", "missions", "mission_events", "mission_media", "mission_equipment_reservations"}) {
            assertTrue(sql.contains("create table " + table), "missing baseline table: " + table);
        }
    }
}
