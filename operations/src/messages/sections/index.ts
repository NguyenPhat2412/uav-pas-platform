import type {SupportedLocale} from '@/i18n/config';
import type {MessageRecord} from '@/types';
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
import customerProVi from './customerPro/vi.json';
import customerProEn from './customerPro/en.json';
import customerProJa from './customerPro/ja.json';
import adminSecurityVi from './adminSecurity/vi.json';
import adminSecurityEn from './adminSecurity/en.json';
import adminSecurityJa from './adminSecurity/ja.json';
import adminCommerceVi from './adminCommerce/vi.json';
import adminCommerceEn from './adminCommerce/en.json';
import adminCommerceJa from './adminCommerce/ja.json';
import adminInfraVi from './adminInfra/vi.json';
import adminInfraEn from './adminInfra/en.json';
import adminInfraJa from './adminInfra/ja.json';
import adminPlatformVi from './adminPlatform/vi.json';
import adminPlatformEn from './adminPlatform/en.json';
import adminPlatformJa from './adminPlatform/ja.json';

// Each section owns one top-level namespace, so portal features can be translated independently.
export const sectionMessages: Record<SupportedLocale, MessageRecord> = {
    vi: {...adminVi, ...opsMissionsVi, ...opsAssetsVi, ...opsSharedVi, ...customerProVi, ...adminSecurityVi, ...adminCommerceVi, ...adminInfraVi, ...adminPlatformVi},
    en: {...adminEn, ...opsMissionsEn, ...opsAssetsEn, ...opsSharedEn, ...customerProEn, ...adminSecurityEn, ...adminCommerceEn, ...adminInfraEn, ...adminPlatformEn},
    ja: {...adminJa, ...opsMissionsJa, ...opsAssetsJa, ...opsSharedJa, ...customerProJa, ...adminSecurityJa, ...adminCommerceJa, ...adminInfraJa, ...adminPlatformJa},
};
