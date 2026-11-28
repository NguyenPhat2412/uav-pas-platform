import type {MarketplaceListing, ProviderBadge} from '@/types/marketplace.types';
import {defaultFlightPlan, type FlightPlanInput} from '@/types/flight-plan.types';
import type {Mission} from '@/types/mission.types';
import type {
    CustomerOrderSummary,
    CustomerProjectUpsertInput,
    OrderStatusGroup,
    OrderTrackingLinkMetrics,
    ProjectScheduleType,
    ProjectSubscriptionCreateInput,
} from '@/types/project.types';

export const ORDER_STATUS_GROUPS: readonly OrderStatusGroup[] = [
    'PENDING',
    'SCHEDULED',
    'IN_FLIGHT',
    'DELIVERED',
    'TO_REVIEW',
] as const;

export const PROJECT_SCHEDULE_TYPES: readonly ProjectScheduleType[] = [
    'ONCE',
    'WEEKLY',
    'MONTHLY',
] as const;

/** Extracts platform-verified badge stats from a listing without ever surfacing fleet/provider names. */
export function resolveListingBadge(
    listing: Pick<
        MarketplaceListing,
        'providerBadge' | 'providerVerificationStatus' | 'officialPlatformListing' | 'ratingAvg' | 'reviewCount'
    >,
): ProviderBadge {
    if (listing.providerBadge) {
        return {
            verified: Boolean(listing.providerBadge.verified),
            ratingAvg: Number(listing.providerBadge.ratingAvg || 0),
            reviewCount: Number(listing.providerBadge.reviewCount || 0),
        };
    }
    return {
        verified: listing.providerVerificationStatus === 'VERIFIED' || Boolean(listing.officialPlatformListing),
        ratingAvg: Number(listing.ratingAvg || 0),
        reviewCount: Number(listing.reviewCount || 0),
    };
}

/** Maps any Mission status (legacy or marketplace flow) into the 5 Shopee-style customer status tabs. */
export function mapMissionToOrderStatusGroup(
    mission: Pick<Mission, 'status' | 'statusGroup' | 'reviewed'>,
): OrderStatusGroup | null {
    if (mission.statusGroup) return mission.statusGroup;
    switch (mission.status) {
        case 'DRAFT':
        case 'PENDING_DISPATCH':
        case 'PENDING_PROVIDER':
        case 'PENDING_CONFIRMATION':
            return 'PENDING';
        case 'ACCEPTED':
        case 'SCHEDULED':
        case 'CONFIRMED':
        case 'RESOURCE_RESERVED':
        case 'READY':
            return 'SCHEDULED';
        case 'IN_FLIGHT':
        case 'IN_PROGRESS':
            return 'IN_FLIGHT';
        case 'DELIVERED':
            return mission.reviewed ? 'DELIVERED' : 'TO_REVIEW';
        case 'COMPLETED':
            return mission.reviewed ? 'DELIVERED' : 'TO_REVIEW';
        case 'REVIEWED':
            return 'DELIVERED';
        default:
            return null;
    }
}

/** True when the customer is allowed to cancel an order before takeoff (`IN_FLIGHT` / `IN_PROGRESS`). */
export function canCancelCustomerOrder(status?: string | null): boolean {
    if (!status) return false;
    return [
        'DRAFT',
        'PENDING_DISPATCH',
        'PENDING_PROVIDER',
        'PENDING_CONFIRMATION',
        'ACCEPTED',
        'SCHEDULED',
        'CONFIRMED',
        'RESOURCE_RESERVED',
        'READY',
    ].includes(status);
}

/** Summarizes a list of missions into the 5 Shopee status counters as a fallback when needed. */
export function summarizeOrdersFromMissions(missions: readonly Mission[]): CustomerOrderSummary {
    const summary: CustomerOrderSummary = {
        pending: 0,
        scheduled: 0,
        inFlight: 0,
        delivered: 0,
        toReview: 0,
    };
    for (const mission of missions) {
        const group = mapMissionToOrderStatusGroup(mission);
        if (group === 'PENDING') summary.pending += 1;
        else if (group === 'SCHEDULED') summary.scheduled += 1;
        else if (group === 'IN_FLIGHT') summary.inFlight += 1;
        else if (group === 'DELIVERED') summary.delivered += 1;
        else if (group === 'TO_REVIEW') summary.toReview += 1;
    }
    return summary;
}

/** Converts interactive `[lat, lng][]` vertices into a GeoJSON Polygon string. */
export function verticesToGeoJsonPolygon(vertices: readonly (readonly [number, number])[]): string {
    const valid = vertices.filter(
        v => Array.isArray(v) && Number.isFinite(v[0]) && Number.isFinite(v[1]),
    );
    if (valid.length < 3) return '';
    const ring = valid.map(v => [Number(v[1].toFixed(6)), Number(v[0].toFixed(6))]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
    }
    return JSON.stringify({
        type: 'Polygon',
        coordinates: [ring],
    });
}

/** Converts a center point + radius (meters) into an 8-point GeoJSON Polygon string when circle/point mode is used. */
export function circleToGeoJsonPolygon(
    latitude?: number,
    longitude?: number,
    radiusMeters = 200,
): string {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
    const lat = Number(latitude);
    const lng = Number(longitude);
    const r = Math.max(30, Number(radiusMeters) || 200);
    const dLat = r / 111_320;
    const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const dLng = r / (111_320 * cosLat);
    const points: [number, number][] = [];
    for (let i = 0; i < 8; i += 1) {
        const angle = (i * Math.PI) / 4;
        points.push([lat + Math.sin(angle) * dLat, lng + Math.cos(angle) * dLng]);
    }
    return verticesToGeoJsonPolygon(points);
}

/** Converts a `LocationPicker` `FlightPlanInput` into a GeoJSON Polygon string (`areaGeoJson`). */
export function flightPlanToGeoJson(plan?: FlightPlanInput | null): string {
    if (!plan) return '';
    if (plan.areaType === 'POLYGON' && plan.vertices.length >= 3) {
        return verticesToGeoJsonPolygon(plan.vertices);
    }
    if (plan.areaType === 'CIRCLE' && plan.vertices.length >= 1) {
        const [lat, lng] = plan.vertices[0];
        return circleToGeoJsonPolygon(lat, lng, plan.radiusMeters ?? 250);
    }
    if (plan.takeoffLatitude != null && plan.takeoffLongitude != null) {
        return circleToGeoJsonPolygon(plan.takeoffLatitude, plan.takeoffLongitude, plan.radiusMeters ?? 200);
    }
    return '';
}

/** Parses a GeoJSON Polygon string back into `[lat, lng][]` vertices for map preview/editing. */
export function geoJsonPolygonToVertices(raw?: string | null): [number, number][] {
    if (!raw?.trim()) return [];
    try {
        const parsed = JSON.parse(raw) as {
            type?: string;
            coordinates?: unknown;
            geometry?: { type?: string; coordinates?: unknown };
        };
        const geom = parsed.type === 'Feature' && parsed.geometry ? parsed.geometry : parsed;
        if (geom.type !== 'Polygon' || !Array.isArray(geom.coordinates) || !Array.isArray(geom.coordinates[0])) {
            return [];
        }
        const ring = geom.coordinates[0] as unknown[];
        const points: [number, number][] = [];
        for (const pair of ring) {
            if (Array.isArray(pair) && pair.length >= 2) {
                const lng = Number(pair[0]);
                const lat = Number(pair[1]);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    points.push([lat, lng]);
                }
            }
        }
        if (points.length >= 4) {
            const first = points[0];
            const last = points[points.length - 1];
            if (Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6) {
                points.pop();
            }
        }
        return points;
    } catch {
        return [];
    }
}

/** Builds a `FlightPlanInput` from an existing `areaGeoJson` string for `LocationPicker`. */
export function geoJsonToFlightPlan(raw?: string | null): FlightPlanInput {
    const vertices = geoJsonPolygonToVertices(raw);
    if (vertices.length >= 3) {
        return {
            ...defaultFlightPlan(),
            areaType: 'POLYGON',
            vertices,
            takeoffLatitude: vertices[0][0],
            takeoffLongitude: vertices[0][1],
        };
    }
    return {
        ...defaultFlightPlan(),
        areaType: 'POLYGON',
    };
}

export function validateProjectInput(input: CustomerProjectUpsertInput): string | null {
    if (!input.name.trim() || input.name.trim().length < 2) return 'project_name_required';
    if (!input.province.trim()) return 'project_province_required';
    return null;
}

export function validateSubscriptionBooking(input: ProjectSubscriptionCreateInput): string | null {
    if (!Number.isInteger(input.listingId) || input.listingId <= 0) return 'listing_required';
    if (!input.areaGeoJson.trim()) return 'area_required';
    if (!input.startDate.trim()) return 'start_date_required';
    if (!Number.isFinite(input.units) || input.units <= 0) return 'units_required';
    return null;
}

/** Formats `/api/v1/orders/{id}/tracking` link telemetry (either object metrics or scalar) into a concise single-line label. */
export function formatTrackingLink(
    link?: OrderTrackingLinkMetrics | string | number | null,
): string {
    if (link == null) return '100%';
    if (typeof link === 'string') return link.trim() || '100%';
    if (typeof link === 'number') return Number.isFinite(link) ? `${Math.round(link)}%` : '100%';
    const loss = Number(link.lossPct ?? 0);
    const qualityPct = Math.max(0, Math.min(100, Math.round(100 - (Number.isFinite(loss) ? loss : 0))));
    const latency = Number(link.averageLatencyMs ?? 0);
    if (Number.isFinite(latency) && latency > 0) {
        return `${qualityPct}% · ${Math.round(latency)}ms`;
    }
    return `${qualityPct}%`;
}

/** Cleans dynamic marketplace DB copy so parenthetical disclaimers or RTK claims never reach customer screens. */
export function sanitizeMarketplaceText(raw?: string | null): string {
    if (!raw) return '';
    return raw
        .replace(/\(\s*(minh hoạ|minh họa|mô phỏng|giả lập)\s*\)/gi, '— $1')
        .replace(/\bRTK\b/gi, 'GNSS');
}

/**
 * Cleans entity titles/names (listings, projects, orders, UAV models) so illustrative markers
 * are never repeated inside names (UI-REVIEW-9-FIXES #1).
 */
export function sanitizeMarketplaceName(raw?: string | null): string {
    if (!raw) return '';
    return raw
        .replace(/\s*(?:[—–\-·|]\s*|\(\s*)(minh hoạ|minh họa|mô phỏng|giả lập|illustrative|simulated)\s*\)?/gi, '')
        .replace(/\bRTK\b/gi, 'GNSS')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Classifies an `ORDER_UPDATED` realtime frame into a deduplication key and toast tone with icon. */
export function describeOrderRealtimeToast(frame: {
    missionId: number;
    status: string;
    statusGroup?: OrderStatusGroup | string | null;
}): {
    dedupeKey: string;
    tone: 'success' | 'info' | 'warning';
} {
    const status = String(frame.status || '').toUpperCase();
    const dedupeKey = `${frame.missionId}:${status}:${frame.statusGroup ?? ''}`;
    if (['CANCELLED', 'REJECTED', 'FAILED'].includes(status)) {
        return {dedupeKey, tone: 'warning'};
    }
    if (['DELIVERED', 'COMPLETED', 'REVIEWED', 'ACCEPTED', 'SCHEDULED', 'CONFIRMED', 'READY'].includes(status)) {
        return {dedupeKey, tone: 'success'};
    }
    return {dedupeKey, tone: 'info'};
}

const SEO_FALLBACK_IMAGES: Record<string, string> = {
    UAV_RENTAL: '/images/services/uav-rental-fleet.webp',
    AREA_INSPECTION: '/images/services/aerial-inspection-grid.webp',
    AERIAL_RECORDING: '/images/services/aerial-recording-cinema.webp',
    DATA_COLLECTION: '/images/solutions/infra-3d-survey.webp',
};

/** Builds fleet-anonymous `<title>`, `description`, and Open Graph cover image for a public service listing. */
export function formatListingSeoMeta(
    listing: Pick<
        MarketplaceListing,
        'title' | 'summary' | 'description' | 'province' | 'missionType' | 'coverImageUrl' | 'basePriceVnd'
    >,
): { title: string; description: string; imageUrl: string } {
    const cleanTitle = sanitizeMarketplaceName(listing.title);
    const title = cleanTitle || 'Chi tiết dịch vụ UAV';
    const rawDesc = sanitizeMarketplaceText(listing.summary || listing.description || '').trim();
    const priceVnd = Number(listing.basePriceVnd || 0);
    const priceSuffix =
        priceVnd > 0
            ? `${new Intl.NumberFormat('vi-VN').format(Math.round(priceVnd))} ₫ · minh hoạ`
            : 'Đơn giá minh hoạ';
    const locationPart = listing.province ? ` tại ${listing.province}` : '';
    const baseDesc = rawDesc || `Dịch vụ bay chuyên dụng từ Đối tác đã xác minh UAV PAS${locationPart}.`;
    const combined = `${baseDesc} — ${priceSuffix}`;
    const description = combined.length > 165 ? `${combined.slice(0, 162).trim()}…` : combined;
    const customCover = listing.coverImageUrl?.trim();
    const imageUrl =
        customCover && (/^https?:\/\//i.test(customCover) || customCover.startsWith('/'))
            ? customCover
            : SEO_FALLBACK_IMAGES[listing.missionType] ?? '/images/services/uav-rental-fleet.webp';
    return {title, description, imageUrl};
}
