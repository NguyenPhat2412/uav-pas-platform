'use client';

import {SimulationConsole} from '@/components/simulation/SimulationConsole';
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function SimulationPage() {
    return (
        <OperationsPage
            permission="UAV_VIEW"
            activeResource="simulation"
        >
            <SimulationConsole/>
        </OperationsPage>
    );
}
