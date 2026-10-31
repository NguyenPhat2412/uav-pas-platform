import {terminalStatuses} from "@/lib/presentation";
import type {Mission} from "@/types/mission/mission.types";

/** UI affordances only; the API remains the authority for every request. */
export function missionControls(mission: Mission, userId: number | undefined, can: (code: string) => boolean) {
    const status = mission.status;
    const assigned = userId !== undefined && userId === mission.operatorId;
    const planning = ['CONFIRMED', 'RESOURCE_RESERVED'].includes(status);
    const preflight = planning || status === 'READY';
    return {
        submit: status === 'DRAFT' && can('MISSION_UPDATE'),
        cancel: ['DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY'].includes(status) && can('MISSION_CANCEL'),
        confirm: status === 'PENDING_CONFIRMATION' && can('MISSION_CONFIRM'),
        reject: ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(status) && can('MISSION_REJECT'),
        ready: status === 'RESOURCE_RESERVED' && !!mission.operatorAccepted && can('MISSION_STATUS_UPDATE'),
        accept: assigned && preflight && !mission.operatorAccepted && can('MISSION_STATUS_UPDATE'),
        conflict: assigned && preflight && can('MISSION_STATUS_UPDATE'),
        start: assigned && status === 'READY' && !!mission.operatorAccepted && can('MISSION_START'),
        complete: assigned && status === 'IN_PROGRESS' && can('MISSION_COMPLETE'),
        fail: assigned && ['RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(status) && can('MISSION_STATUS_UPDATE'),
        forceFail: !assigned && ['RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(status) && can('MISSION_CONFIRM'),
        upload: !terminalStatuses.includes(status) && can('MISSION_MEDIA_UPLOAD'),
        station: planning && !mission.stationId && can('MISSION_ASSIGN_STATION') && can('STATION_READ'),
        uav: planning && !mission.uavId && can('MISSION_ASSIGN_UAV') && can('UAV_READ'),
        replaceUav: preflight && !!mission.uavId && can('MISSION_ASSIGN_UAV') && can('UAV_READ'),
        unassignUav: preflight && !!mission.uavId && can('MISSION_ASSIGN_UAV') && can('UAV_READ'),
        operator: planning && !mission.operatorId && can('MISSION_ASSIGN_OPERATOR') && can('USER_READ'),
        redispatchOperator: preflight && !!mission.operatorId && can('MISSION_ASSIGN_OPERATOR') && can('USER_READ'),
        redispatchStation: preflight && !!mission.stationId && can('MISSION_ASSIGN_STATION') && can('STATION_READ'),
        redispatchEquipment: preflight && can('MISSION_RESERVE_EQUIPMENT') && can('INVENTORY_READ'),
        equipment: planning && can('MISSION_RESERVE_EQUIPMENT') && can('INVENTORY_READ'),
    };
}
