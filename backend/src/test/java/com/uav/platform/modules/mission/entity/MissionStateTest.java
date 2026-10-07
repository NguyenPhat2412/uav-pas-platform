package com.uav.platform.modules.mission.entity;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.*;

import org.junit.jupiter.api.Test;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.common.StationStatus;
import com.uav.platform.modules.uav.entity.Uav;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class MissionStateTest {
    private Mission mission() {
        return Mission.draft(null, MissionType.AREA_INSPECTION, "Inspect area",
                "North sector", LocalDate.now(), LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2), "Hanoi", null, null,
                MissionPriority.NORMAL, null);
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

        assertThrows(IllegalStateException.class, () -> mission.transitionTo(MissionStatus.COMPLETED));
        mission.transitionTo(MissionStatus.CANCELLED);
        assertThrows(IllegalStateException.class, () -> mission.transitionTo(MissionStatus.DRAFT));
    }

    @Test
    void readyRequiresEveryResource() {
        Mission mission = mission();
        assertFalse(mission.hasRequiredResources(false));

        mission.assignStation(new Station("ST-1", "Station", null, null, null, StationStatus.ACTIVE));
        mission.assignUav(new Uav("Model", "UAV-1", "Maker"));
        mission.assignOperator(new AppUser("operator", "operator@test.vn", "hash", null, UserStatus.ACTIVE));
        assertFalse(mission.hasRequiredResources(false));
        assertTrue(mission.hasRequiredResources(true));
    }
}
