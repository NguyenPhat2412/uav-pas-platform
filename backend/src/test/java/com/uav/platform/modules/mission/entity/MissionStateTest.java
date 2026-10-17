package com.uav.platform.modules.mission.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.station.service.impl.StationOperations;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

class MissionStateTest {
    private Mission mission() {
        return MissionOperations.draft(
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

        MissionOperations.transitionTo(mission, MissionStatus.PENDING_CONFIRMATION);
        MissionOperations.transitionTo(mission, MissionStatus.CONFIRMED);
        MissionOperations.transitionTo(mission, MissionStatus.RESOURCE_RESERVED);
        MissionOperations.transitionTo(mission, MissionStatus.READY);
        MissionOperations.transitionTo(mission, MissionStatus.IN_PROGRESS);
        MissionOperations.transitionTo(mission, MissionStatus.COMPLETED);

        assertEquals(MissionStatus.COMPLETED, mission.getStatus());
    }

    @Test
    void rejectsSkippingStatesAndChangingTerminalState() {
        Mission mission = mission();

        assertThrows(
                IllegalStateException.class,
                () -> MissionOperations.transitionTo(mission, MissionStatus.COMPLETED));
        MissionOperations.transitionTo(mission, MissionStatus.CANCELLED);
        assertThrows(
                IllegalStateException.class,
                () -> MissionOperations.transitionTo(mission, MissionStatus.DRAFT));
    }

    @Test
    void readyRequiresEveryResource() {
        Mission mission = mission();
        assertFalse(MissionOperations.hasRequiredResources(mission, false));

        MissionOperations.assignStation(
                mission,
                StationOperations.create(
                        "ST-1", "Station", null, null, null, StationStatus.ACTIVE));
        MissionOperations.assignUav(mission, new Uav("Model", "UAV-1", "Maker"));
        MissionOperations.assignOperator(
                mission,
                new AppUser("operator", "operator@test.vn", "hash", null, UserStatus.ACTIVE));
        assertFalse(MissionOperations.hasRequiredResources(mission, false));
        assertTrue(MissionOperations.hasRequiredResources(mission, true));
    }
}
