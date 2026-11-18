import React from 'react';
import {ProjectSubscriptionWizardScreen} from '@/components/marketplace/catalog/ProjectSubscriptionWizardScreen';

/**
 * 3-step "Đăng ký cho dự án" wizard route (`/customer/marketplace/subscribe?slug=...&units=...`).
 *
 * Flow:
 * 1. Choose or create target project (`GET / POST /api/v1/projects`)
 * 2. Draw flight boundary polygon or use GPS (`ProjectZoneMapField`)
 * 3. Select schedule cadence, start date, booking units & confirm (`POST /api/v1/projects/{id}/subscriptions`)
 *
 * Thin route boundary maintained per mobile architecture guard.
 */
export default function MarketplaceSubscribeRoute() {
    return <ProjectSubscriptionWizardScreen/>;
}
