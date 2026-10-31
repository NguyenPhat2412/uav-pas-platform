package com.uav.platform.enums.storage;

/**
 * Where a stored object belongs. Every value except TRAINING is a row of media_assets; the module follows from
 * what the row is linked to (mission, station, UAV, equipment, a user's avatar) or UNLINKED when nothing names it.
 */
public enum StoredFileModule {
    MISSION_MEDIA,
    TRAINING,
    AVATAR,
    STATION_MEDIA,
    UAV_MEDIA,
    EQUIPMENT_MEDIA,
    UNLINKED
}
