import type {SupportedLocale} from '@/i18n/config';
import adminVi from './admin/vi.json';
import adminEn from './admin/en.json';
import adminJa from './admin/ja.json';
import opsMissionsVi from './opsMissions/vi.json';
import opsMissionsEn from './opsMissions/en.json';
import opsMissionsJa from './opsMissions/ja.json';
import opsAssetsVi from './opsAssets/vi.json';
import opsAssetsEn from './opsAssets/en.json';
import opsAssetsJa from './opsAssets/ja.json';
import opsSharedVi from './opsShared/vi.json';
import opsSharedEn from './opsShared/en.json';
import opsSharedJa from './opsShared/ja.json';

type MessageRecord = Record<string, unknown>;

// Each section owns one top-level namespace, so portal features can be translated independently.
export const sectionMessages: Record<SupportedLocale, MessageRecord> = {
    vi: {...adminVi, ...opsMissionsVi, ...opsAssetsVi, ...opsSharedVi},
    en: {...adminEn, ...opsMissionsEn, ...opsAssetsEn, ...opsSharedEn},
    ja: {...adminJa, ...opsMissionsJa, ...opsAssetsJa, ...opsSharedJa},
};
