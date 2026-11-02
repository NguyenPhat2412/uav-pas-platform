import type {MediaAsset, MediaVisibility} from '@/types/resources';

/* Browser-to-storage media upload flow. */

export type MediaUploadStep = 'registering' | 'uploading' | 'confirming';

export interface MediaUploadOptions {
    /** Resume an asset that was registered but never confirmed instead of registering a new one. */
    existing?: MediaAsset;
    link?: { type: string; id: string };
    /** PRIVATE when left out. */
    visibility?: MediaVisibility;
    onStep?: (step: MediaUploadStep, asset?: MediaAsset) => void;
}
