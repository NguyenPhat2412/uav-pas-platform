package com.uav.platform.enums.simulation;

/** Operator command or live fault-injection trigger sent to a simulated UAV. */
public enum SimCommand {
    PAUSE,
    RESUME,
    RETURN_TO_HOME,
    LAND,
    SIMULATE_GPS_DEGRADE,
    SIMULATE_BATTERY_DROP
}
