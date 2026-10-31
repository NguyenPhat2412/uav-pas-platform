'use client';
import {UavPanel} from "@/components/uav/UavPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function UavsPage() {
    return <OperationsPage
                           permission="UAV_READ" activeResource="uavs"><UavPanel/></OperationsPage>;
}
