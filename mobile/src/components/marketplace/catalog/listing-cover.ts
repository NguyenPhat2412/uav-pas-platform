import type {ImageSourcePropType} from 'react-native';
import type {MarketplaceListing} from '@/shared/types/marketplace/marketplace.types';

const BUNDLED_SERVICE_COVERS: Record<string, ImageSourcePropType> = {
    AREA_INSPECTION: require('../../../../assets/services/aerial-inspection-grid.webp') as ImageSourcePropType,
    AERIAL_RECORDING: require('../../../../assets/services/aerial-recording-cinema.webp') as ImageSourcePropType,
    DATA_COLLECTION: require('../../../../assets/services/data-collection-corridor.webp') as ImageSourcePropType,
    UAV_RENTAL: require('../../../../assets/services/uav-rental-fleet.webp') as ImageSourcePropType,
};

/**
 * Resolves a Flight Service cover image:
 * 1. Remote R2 / signed gateway URL (`http://` or `https://`)
 * 2. Bundled WebP asset matching `/images/services/*.webp` or `missionType`
 * 3. `null` -> caller renders `primaryLight` frame + category Lucide icon (UI-GUIDE §4).
 */
export function resolveListingCoverSource(
    item: Pick<MarketplaceListing, 'coverImageUrl' | 'missionType'>,
): ImageSourcePropType | null {
    const raw = item.coverImageUrl?.trim();
    if (raw) {
        if (/^https?:\/\//i.test(raw)) return {uri: raw};
        if (raw.includes('aerial-inspection')) return BUNDLED_SERVICE_COVERS.AREA_INSPECTION;
        if (raw.includes('aerial-recording')) return BUNDLED_SERVICE_COVERS.AERIAL_RECORDING;
        if (raw.includes('data-collection')) return BUNDLED_SERVICE_COVERS.DATA_COLLECTION;
        if (raw.includes('uav-rental')) return BUNDLED_SERVICE_COVERS.UAV_RENTAL;
    }
    return BUNDLED_SERVICE_COVERS[item.missionType] ?? null;
}
