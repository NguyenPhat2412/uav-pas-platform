package com.uav.platform.enums.simulation;

/** Flight phase of a simulated UAV, in the order a normal flight goes through them. */
public enum SimFlightMode {
    TAKEOFF,
    MISSION,
    HOLD,
    RETURN_TO_HOME,
    LANDING,
    LANDED
}
