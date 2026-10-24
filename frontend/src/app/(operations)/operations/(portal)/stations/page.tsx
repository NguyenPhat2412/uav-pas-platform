'use client';
import {StationPanel} from "@/features/stations/components/StationPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function StationsPage() {
    return <OperationsPage
                           permission="STATION_READ" activeResource="stations"><StationPanel/></OperationsPage>;
}
