package com.uav.platform.entity.mission;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.service.impl.mission.MissionOperations;
import com.uav.platform.service.impl.station.StationOperations;

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
