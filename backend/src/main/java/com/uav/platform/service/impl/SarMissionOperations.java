package com.uav.platform.service.impl;

import com.uav.platform.entity.Mission;
import com.uav.platform.entity.SarMission;
import com.uav.platform.enums.SarStatus;

/** Internal creation rules shared by application services and setup callers. */
public final class SarMissionOperations {
    private SarMissionOperations() {}

    public static SarMission create(
            Mission mission,
            String searchAreaPolygon,
            Double lkpLatitude,
            Double lkpLongitude,
            Double driftRadiusMeters,
            String emergencyContact,
            Integer victimCountEstimated,
            String notes) {
        SarMission entity = new SarMission();
        entity.setMission(mission);
        entity.setSearchAreaPolygon(searchAreaPolygon);
        entity.setLkpLatitude(lkpLatitude);
        entity.setLkpLongitude(lkpLongitude);
        entity.setDriftRadiusMeters(driftRadiusMeters != null ? driftRadiusMeters : 500.0);
        entity.setEmergencyContact(emergencyContact);
        entity.setVictimCountEstimated(victimCountEstimated != null ? victimCountEstimated : 1);
        entity.setNotes(notes);
        entity.setSarStatus(SarStatus.SEARCHING);
        return entity;
    }
}
