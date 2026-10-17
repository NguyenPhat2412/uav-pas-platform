package com.uav.platform.modules.mission.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

class MissionStateTest {
    private Mission mission() {
        return Mission.draft(
                null,
                MissionType.AREA_INSPECTION,
                "Inspect area",
                "North sector",
                LocalDate.now(),
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2),
                "Hanoi",
                null,
                null,
                MissionPriority.NORMAL,
                null);
    }

    @Test
    void acceptsOnlyDeclaredForwardTransitions() {
        Mission mission = mission();

        mission.transitionTo(MissionStatus.PENDING_CONFIRMATION);
        mission.transitionTo(MissionStatus.CONFIRMED);
        mission.transitionTo(MissionStatus.RESOURCE_RESERVED);
        mission.transitionTo(MissionStatus.READY);
        mission.transitionTo(MissionStatus.IN_PROGRESS);
        mission.transitionTo(MissionStatus.COMPLETED);

        assertEquals(MissionStatus.COMPLETED, mission.getStatus());
    }

    @Test
    void rejectsSkippingStatesAndChangingTerminalState() {
        Mission mission = mission();

        assertThrows(
                IllegalStateException.class, () -> mission.transitionTo(MissionStatus.COMPLETED));
        mission.transitionTo(MissionStatus.CANCELLED);
        assertThrows(IllegalStateException.class, () -> mission.transitionTo(MissionStatus.DRAFT));
    }

    @Test
    void readyRequiresEveryResource() {
        Mission mission = mission();
        assertFalse(mission.hasRequiredResources(false));

        mission.assignStation(
                new Station("ST-1", "Station", null, null, null, StationStatus.ACTIVE));
        mission.assignUav(new Uav("Model", "UAV-1", "Maker"));
        mission.assignOperator(
                new AppUser("operator", "operator@test.vn", "hash", null, UserStatus.ACTIVE));
        assertFalse(mission.hasRequiredResources(false));
        assertTrue(mission.hasRequiredResources(true));
    }
}
