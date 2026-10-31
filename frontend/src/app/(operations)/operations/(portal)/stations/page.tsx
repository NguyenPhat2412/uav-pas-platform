'use client';
import {StationPanel} from "@/components/station/StationPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function StationsPage() {
    return <OperationsPage
                           permission="STATION_READ" activeResource="stations"><StationPanel/></OperationsPage>;
}
