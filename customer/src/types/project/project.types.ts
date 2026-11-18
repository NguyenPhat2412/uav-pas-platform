import type {PageResponse} from '@/types';
import type {PricingModel} from '@/types/marketplace/marketplace.types';
import type {MissionStatus} from '@/types/mission/mission.types';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type ProjectScheduleType = 'ONCE' | 'WEEKLY' | 'MONTHLY';
export type ProjectSubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';
export type OrderStatusGroup = 'PENDING' | 'SCHEDULED' | 'IN_FLIGHT' | 'DELIVERED' | 'TO_REVIEW';

export interface CustomerProject {
    id: number;
    code?: string | null;
    name: string;
    province: string;
    areaGeoJson?: string | null;
    note?: string | null;
    status?: ProjectStatus | null;
    activeSubscriptionCount?: number;
    missionCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CustomerProjectUpsertInput {
    name: string;
    province: string;
    areaGeoJson?: string | null;
    note?: string | null;
    status?: ProjectStatus;
}

export interface ProjectSubscription {
    id: number;
    projectId: number;
    projectName?: string | null;
    listingId: number;
    listingSlug?: string | null;
    listingTitle?: string | null;
    areaGeoJson?: string | null;
    locationName?: string | null;
    scheduleType: ProjectScheduleType;
    status: ProjectSubscriptionStatus;
    startDate: string;
    nextRunAt?: string | null;
    units: number;
    pricingModel?: PricingModel | null;
    unitPriceVnd?: number | null;
    estimatedTotalVnd?: number | null;
    firstMissionId?: number | null;
    latestMissionId?: number | null;
    note?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectSubscriptionCreateInput {
    listingId: number;
    areaGeoJson: string;
    scheduleType: ProjectScheduleType;
    startDate: string;
    units: number;
    locationName?: string;
    note?: string;
}

export interface ProjectSubscriptionUpdateInput {
    status?: ProjectSubscriptionStatus;
    scheduleType?: ProjectScheduleType;
    startDate?: string;
    units?: number;
    areaGeoJson?: string;
    note?: string;
}

export interface CustomerOrderSummary {
    pending: number;
    scheduled: number;
    inFlight: number;
    delivered: number;
    toReview: number;
}

export interface OrderTrackingPosition {
    latitude: number;
    longitude: number;
    altitudeMeters?: number | null;
    headingDeg?: number | null;
    speedMs?: number | null;
}

export interface OrderTrackingSnapshot {
    missionId?: number;
    status?: MissionStatus | string | null;
    statusGroup?: OrderStatusGroup | string | null;
    progressPct: number;
    position?: OrderTrackingPosition | null;
    battery?: number | null;
    link?: string | number | null;
    etaMinutes?: number | null;
    updatedAt?: string | null;
}

export type CustomerProjectPage = PageResponse<CustomerProject>;
export type ProjectSubscriptionPage = PageResponse<ProjectSubscription>;
