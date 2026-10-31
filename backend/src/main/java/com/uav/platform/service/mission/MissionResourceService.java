package com.uav.platform.service.mission;

import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionEquipmentReservation;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;

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
