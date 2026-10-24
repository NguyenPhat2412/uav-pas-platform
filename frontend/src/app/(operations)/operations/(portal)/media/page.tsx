'use client';
import {MediaPanel} from "@/features/media/components/MediaPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function MediaPage() {
    return <OperationsPage
                           permission="MEDIA_READ" activeResource="media"><MediaPanel/></OperationsPage>;
}
