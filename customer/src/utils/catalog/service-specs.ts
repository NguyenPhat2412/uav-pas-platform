/**
 * Customer-facing service sheet. Deliverables only list formats the platform accepts for handover
 * (JPEG/PNG/WebP images, MP4/WebM video, PDF documents).
 */
import type {Deliverable} from '@/types';

export type {Deliverable};

export const serviceDeliverables: Record<string, Deliverable[]> = {
    UAV_RENTAL: ['flightLog', 'geotaggedPhotos', 'video'],
    AREA_INSPECTION: ['geotaggedPhotos', 'inspectionReport'],
    AERIAL_RECORDING: ['video', 'geotaggedPhotos'],
    DATA_COLLECTION: ['geotaggedPhotos', 'dataSummary'],
};
