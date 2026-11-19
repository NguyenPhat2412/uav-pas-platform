import type {ImageSourcePropType} from 'react-native';
import {
    Award,
    Camera,
    Map,
    Package,
    Plane,
    Sparkles,
    Zap,
    type LucideIcon,
} from 'lucide-react-native';
import {
    iconNameForMissionType,
    type ServiceCategoryIconName,
} from '@/shared/lib/marketplace/service-categories';
import type {MarketplaceListing} from '@/shared/types/marketplace/marketplace.types';

export const LISTING_CATEGORY_ICONS: Record<ServiceCategoryIconName, LucideIcon> = {
    Sparkles,
    Map,
    Zap,
    Camera,
    Plane,
    Award,
    Package,
};

export function resolveListingCategoryIconName(
    item: Pick<MarketplaceListing, 'listingType' | 'missionType'>,
): ServiceCategoryIconName {
    if (item.listingType === 'WET_LEASE') return 'Award';
    if (item.listingType === 'DRY_LEASE') return 'Package';
    return iconNameForMissionType(item.missionType);
}

const BUNDLED_COVERS: readonly [string, ImageSourcePropType][] = [
    ['aerial-inspection-grid', require('../../../../assets/services/aerial-inspection-grid.webp') as ImageSourcePropType],
    ['aerial-recording-cinema', require('../../../../assets/services/aerial-recording-cinema.webp') as ImageSourcePropType],
    ['uav-rental-fleet', require('../../../../assets/services/uav-rental-fleet.webp') as ImageSourcePropType],
    ['infra-3d-survey', require('../../../../assets/services/infra-3d-survey.webp') as ImageSourcePropType],
    ['edge-ai-kv260-tracking', require('../../../../assets/services/edge-ai-kv260-tracking.webp') as ImageSourcePropType],
    ['sar-emergency-response', require('../../../../assets/services/sar-emergency-response.webp') as ImageSourcePropType],
    ['step-05-data-handover', require('../../../../assets/services/step-05-data-handover.webp') as ImageSourcePropType],
    ['uav-hero-1', require('../../../../assets/hero/uav-hero-1.webp') as ImageSourcePropType],
    ['uav-hero-2', require('../../../../assets/hero/uav-hero-2.webp') as ImageSourcePropType],
    ['uav-hero-3', require('../../../../assets/hero/uav-hero-3.webp') as ImageSourcePropType],
];

const BLOCKED_LOGO_COVER_RE =
    /usgs|plum-island|yosemite|data-collection-corridor|managed-ops-command|step-01-select-service/i;

/**
 * Resolves a Flight Service cover image (UI-GUIDE §4 & UI-REVIEW-9-FIXES #2):
 * - `coverImageUrl == null` or blocked third-party logo asset -> returns `null` so the card
 *   renders a clean `primaryLight` frame + category Lucide icon instead of duplicating photos.
 * - Relative `/images/...` path -> maps to verified logo-free bundled WebP asset.
 * - Remote R2 / signed gateway URL (`http://` or `https://`) -> returns `{uri}`.
 */
export function resolveListingCoverSource(
    item: Pick<MarketplaceListing, 'coverImageUrl' | 'missionType'>,
): ImageSourcePropType | null {
    const raw = item.coverImageUrl?.trim();
    if (!raw || BLOCKED_LOGO_COVER_RE.test(raw)) {
        return null;
    }
    for (const [token, asset] of BUNDLED_COVERS) {
        if (raw.includes(token)) return asset;
    }
    if (/^https?:\/\//i.test(raw)) {
        return {uri: raw};
    }
    return null;
}
