'use client';

import {SarCockpitPanel} from '@/features/sar/components/SarCockpitPanel';
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function SarCockpitPage() {
    return (
        <OperationsPage
            permission="MISSION_VIEW"
            activeResource="sar-cockpit"
        >
            <SarCockpitPanel/>
        </OperationsPage>
    );
}
