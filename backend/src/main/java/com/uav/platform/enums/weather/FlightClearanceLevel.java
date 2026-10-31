package com.uav.platform.enums.weather;

/** Take-off verdict for a place and hour; UNAVAILABLE when no weather data could be obtained. */
public enum FlightClearanceLevel {
    GO,
    CAUTION,
    NO_GO,
    UNAVAILABLE
}
