package com.uav.platform.enums;

/** Lifecycle and terminal outcome of a persisted simulation rehearsal run. */
public enum SimRunStatus {
    RUNNING,
    COMPLETED,
    FAILSAFE_RTH,
    EMERGENCY_LANDED,
    ABORTED
}
