'use client';
import {UavPanel} from "@/features/uavs/components/UavPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function UavsPage() {
    return <OperationsPage
                           permission="UAV_READ" activeResource="uavs"><UavPanel/></OperationsPage>;
}
