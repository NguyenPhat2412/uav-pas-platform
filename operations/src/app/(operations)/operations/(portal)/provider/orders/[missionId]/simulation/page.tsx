'use client';

import {use} from 'react';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {SimulationConsole} from '@/components/simulation/SimulationConsole';

export default function OperationsOrderSimulationPage({
    params,
}: {
    params: Promise<{missionId: string}>;
}) {
    const {missionId} = use(params);
    const parsedId = Number(missionId);
    return (
        <OperationsPage permission="UAV_VIEW" activeResource="simulation">
            <SimulationConsole initialMissionId={Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : undefined}/>
        </OperationsPage>
    );
}
