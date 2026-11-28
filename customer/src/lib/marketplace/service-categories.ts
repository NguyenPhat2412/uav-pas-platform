import type {ListingType} from '@/types/marketplace.types';
import type {MissionType} from '@/types/mission.types';

/**
 * Pure TypeScript shared service category taxonomy (used by both Customer Web and Mobile via
 * `mobile/scripts/sync-shared.mjs`). Contains zero React or `lucide-react` imports.
 *
 * All 6 categories map 1-to-1 to real backend `MissionType` / `ListingType` filters accepted by
 * `GET /api/v1/public/marketplace/listings`.
 */
export type ServiceCategoryIconName =
    | 'Sparkles'
    | 'Map'
    | 'Zap'
    | 'Camera'
    | 'Plane'
    | 'Award'
    | 'Package';

export interface ServiceCategoryDef {
    key: string;
    labelKey: string;
    icon: ServiceCategoryIconName;
    missionType?: MissionType;
    listingType?: ListingType;
    href: string;
}

/** Web-only "All" filter tile (excluded from Mobile home grid per UI-REVIEW-9-FIXES #8). */
export const WEB_ALL_SERVICE_CATEGORY: ServiceCategoryDef = {
    key: 'all',
    labelKey: 'marketplaceShop.allCategories',
    icon: 'Sparkles',
    href: '/services',
};

/**
 * Canonical 6 shared service categories (<= 8 max) aligned directly with backend `MissionType`
 * and `ListingType` enums.
 */
export const SERVICE_CATEGORIES: readonly ServiceCategoryDef[] = [
    {
        key: 'AREA_INSPECTION',
        labelKey: 'marketplaceShop.catInspection',
        icon: 'Map',
        missionType: 'AREA_INSPECTION',
        href: '/services?category=AREA_INSPECTION',
    },
    {
        key: 'DATA_COLLECTION',
        labelKey: 'marketplaceShop.catData',
        icon: 'Zap',
        missionType: 'DATA_COLLECTION',
        href: '/services?category=DATA_COLLECTION',
    },
    {
        key: 'AERIAL_RECORDING',
        labelKey: 'marketplaceShop.catRecording',
        icon: 'Camera',
        missionType: 'AERIAL_RECORDING',
        href: '/services?category=AERIAL_RECORDING',
    },
    {
        key: 'UAV_RENTAL',
        labelKey: 'marketplaceShop.catRental',
        icon: 'Plane',
        missionType: 'UAV_RENTAL',
        href: '/services?category=UAV_RENTAL',
    },
    {
        key: 'WET_LEASE',
        labelKey: 'marketplaceShop.catWetLease',
        icon: 'Award',
        listingType: 'WET_LEASE',
        href: '/services?listingType=WET_LEASE',
    },
    {
        key: 'DRY_LEASE',
        labelKey: 'marketplaceShop.catDryLease',
        icon: 'Package',
        listingType: 'DRY_LEASE',
        href: '/services?listingType=DRY_LEASE',
    },
] as const;

export const WEB_SERVICE_CATEGORIES: readonly ServiceCategoryDef[] = [
    WEB_ALL_SERVICE_CATEGORY,
    ...SERVICE_CATEGORIES,
] as const;

export function iconNameForMissionType(missionType?: MissionType | string | null): ServiceCategoryIconName {
    switch (missionType) {
        case 'AREA_INSPECTION':
            return 'Map';
        case 'DATA_COLLECTION':
            return 'Zap';
        case 'AERIAL_RECORDING':
            return 'Camera';
        case 'UAV_RENTAL':
            return 'Plane';
        default:
            return 'Package';
    }
}
