package com.uav.platform.modules.media.dto.record;

public record ReadPermissions(
        boolean manageMedia,
        boolean viewMissionMedia,
        boolean viewAllMissions,
        boolean readStations,
        boolean readUavs,
        boolean readInventory) {}
