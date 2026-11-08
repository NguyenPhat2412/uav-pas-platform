'use client';
import {missionService} from '@/api/mission/missions.api';
import {customerMissionService} from '@/api/mission/customer-missions.api';
import {stationsService} from '@/api/station/stations.api';
import {uavsService} from '@/api/uav/uavs.api';
import {inventoryService} from '@/api/inventory/inventory.api';
import {operatorsService} from '@/api/user/operators.api';
import {mediaService} from '@/api/media/media.api';

/**
 * Mission desk steps that must run in order against the mission's current version (assign, reserve,
 * redispatch, signed upload then confirm then attach, lifecycle transitions). The screens await them
 * with their own busy, error and reload handling, so they are plain requests, not cached queries.
 */
export function useMissionWorkflow() {
    return missionService;
}

/** Customer draft checks and downloads, awaited step by step inside the booking and detail screens. */
export function useCustomerMissionWorkflow() {
    return customerMissionService;
}

const DISPATCH_SOURCES = {
    listStations: stationsService.listStations,
    listUavs: uavsService.listUavs,
    listEquipment: inventoryService.listEquipment,
    listOperators: operatorsService.listOperators,
    mediaDownloadUrl: mediaService.downloadUrl,
};

/**
 * Paged sources the dispatch panel walks to the end before offering resources, plus signed media links.
 * One shared object, so it is safe in effect and callback dependencies.
 */
export function useMissionDispatchSources() {
    return DISPATCH_SOURCES;
}
