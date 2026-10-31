package com.uav.platform.service.permission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.enums.permission.PermissionCode;

import org.junit.jupiter.api.Test;

import java.util.Set;

class Phase2PermissionRegistryTest {
    @Test
    void registersAllMissionPermissions() {
        Set<String> names =
                Set.of(
                        "MISSION_VIEW",
                        "MISSION_VIEW_ALL",
                        "MISSION_CREATE",
                        "MISSION_UPDATE",
                        "MISSION_CANCEL",
                        "MISSION_CONFIRM",
                        "MISSION_ASSIGN_STATION",
                        "MISSION_ASSIGN_UAV",
                        "MISSION_ASSIGN_OPERATOR",
                        "MISSION_START",
                        "MISSION_COMPLETE",
                        "MISSION_STATUS_UPDATE",
                        "MISSION_MEDIA_VIEW",
                        "MISSION_MEDIA_UPLOAD",
                        "MISSION_TIMELINE_VIEW",
                        "DASHBOARD_MISSION");

        for (String name : names) {
            assertTrue(
                    java.util.Arrays.stream(PermissionCode.values())
                            .anyMatch(code -> code.name().equals(name)),
                    name);
        }
    }

    @Test
    void exposesMissionRouteConstants() {
        assertEquals("/api/v1/missions", ApiRoutes.Missions.BASE);
        assertEquals("/api/v1/missions/{id}", ApiRoutes.Missions.FULL_MISSION_BY_ID);
        assertEquals("/api/v1/missions/{id}/assign-uav", ApiRoutes.Missions.FULL_ASSIGN_UAV);
        assertEquals("/api/v1/missions/{id}/timeline", ApiRoutes.Missions.FULL_TIMELINE);
    }
}
