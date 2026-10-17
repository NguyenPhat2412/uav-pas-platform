package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.entity.MissionEquipmentReservation;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.user.entity.AppUser;

import java.util.List;

/** Resource locks and release rules shared by dispatch and lifecycle workflows. */
public interface MissionResourceService {
    AppUser lockOperator(Long id);

    boolean eligibleOperator(AppUser operator);

    void requireOperatorAvailable(AppUser operator, Mission mission);

    Equipment lockEquipment(Long id);

    List<MissionEquipmentReservation> activeReservationsLocked(Long id);

    boolean sameStation(Station missionStation, Station resourceStation);

    void validatePreflightResources(Mission mission);

    Uav lockUav(Long id);

    List<MissionStatus> excludedStatuses();

    void releaseResources(Mission mission, String actor);

    void requireExclusiveUavOwnership(Mission mission);

    void changeUavStatus(Uav uav, UavStatus status, String reason, String actor);
}
