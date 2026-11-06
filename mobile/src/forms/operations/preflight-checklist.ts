import type {AirspaceClearance} from '@/shared/types/airspace/airspace.types';
import type {Mission} from '@/shared/types/mission/mission.types';

export interface PreflightChecklistState {
    batteryAndPropellersSafe: boolean;
    gnssRtkLocked: boolean;
    weatherCleared: boolean;
    airspaceAndPermitCleared: boolean;
}

export type PreflightChecklistKey = keyof PreflightChecklistState;

export const PREFLIGHT_CHECKLIST_KEYS: readonly PreflightChecklistKey[] = [
    'batteryAndPropellersSafe',
    'gnssRtkLocked',
    'weatherCleared',
    'airspaceAndPermitCleared',
];

export const INITIAL_PREFLIGHT_CHECKLIST: PreflightChecklistState = {
    batteryAndPropellersSafe: false,
    gnssRtkLocked: false,
    weatherCleared: false,
    airspaceAndPermitCleared: false,
};

export function togglePreflightItem(
    state: PreflightChecklistState,
    key: PreflightChecklistKey,
): PreflightChecklistState {
    return {...state, [key]: !state[key]};
}

export function preflightProgressCount(state: PreflightChecklistState): { checked: number; total: 4 } {
    const checked = PREFLIGHT_CHECKLIST_KEYS.filter(key => state[key]).length;
    return {checked, total: 4};
}

export function isPreflightChecklistComplete(state: PreflightChecklistState): boolean {
    return PREFLIGHT_CHECKLIST_KEYS.every(key => state[key]);
}

export type TakeoffMissionSubject = Pick<Mission, 'status'> & {
    operatorAccepted?: boolean | null;
    permit?: Mission['permit'];
    flightPlan?: Mission['flightPlan'];
    permitSupport?: boolean;
};

export function isMissionPermitRequired(
    mission: TakeoffMissionSubject,
    airspaceClearance?: AirspaceClearance | null,
): boolean {
    if (airspaceClearance === 'PERMIT_REQUIRED') return true;
    if (mission.permitSupport || mission.flightPlan?.permitSupport) return true;
    return mission.permit != null && mission.permit.status !== 'NOT_REQUIRED';
}

export function canTakeoffMission(
    mission: TakeoffMissionSubject,
    checklist: PreflightChecklistState,
    airspaceClearance?: AirspaceClearance | null,
): { allowed: boolean; blockerKey: string | null } {
    if (mission.status !== 'READY') {
        return {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.notReady'};
    }
    if (!mission.operatorAccepted) {
        return {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.acceptanceRequired'};
    }
    if (airspaceClearance === 'BLOCKED') {
        return {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.airspaceBlocked'};
    }
    if (isMissionPermitRequired(mission, airspaceClearance) && mission.permit?.status !== 'VERIFIED') {
        return {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.permitUnverified'};
    }
    if (!isPreflightChecklistComplete(checklist)) {
        return {allowed: false, blockerKey: 'mobile.ops.preflight.blockers.checklistIncomplete'};
    }
    return {allowed: true, blockerKey: null};
}
