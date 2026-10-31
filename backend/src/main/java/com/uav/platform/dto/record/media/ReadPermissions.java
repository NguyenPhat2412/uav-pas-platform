package com.uav.platform.dto.record.media;

public record ReadPermissions(
        boolean manageMedia,
        boolean viewMissionMedia,
        boolean viewAllMissions,
        boolean readStations,
        boolean readUavs,
        boolean readInventory) {}
