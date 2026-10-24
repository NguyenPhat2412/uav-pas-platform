'use client';

import {SarCockpitPanel} from '@/features/sar/components/SarCockpitPanel';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useI18n} from '@/contexts/I18nContext';

export default function FlightOpsControlPage() {
    const {t} = useI18n();
    return (
        <OperationsPage
            title={t('opsShared.sar.page.title')}
            meta={t('opsShared.sar.page.meta')}
            permission="MISSION_VIEW"
            activeResource="sar-cockpit"
        >
            <SarCockpitPanel/>
        </OperationsPage>
    );
}
