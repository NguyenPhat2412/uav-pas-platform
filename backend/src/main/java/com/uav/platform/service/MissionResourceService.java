package com.uav.platform.service;

import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionEquipmentReservation;
import com.uav.platform.entity.Station;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.UavStatus;

import java.util.List;

/** Resource locks and release rules shared by dispatch and lifecycle workflows. */
public interface MissionResourceService {
    AppUser lockOperator(Long id);

    boolean eligibleOperator(AppUser operator);

    void requireOperatorAvailable(AppUser operator, Mission mission);

    boolean isUavFreeFor(Uav uav, Mission mission);

    void requireUavFreeFor(Uav uav, Mission mission);

    void requireOperatorFreeFor(AppUser operator, Mission mission);

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
