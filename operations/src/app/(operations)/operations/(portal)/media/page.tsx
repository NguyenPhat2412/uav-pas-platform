'use client';
import {MediaPanel} from "@/components/media/MediaPanel";
import {OperationsPage} from '@/components/layout/OperationsPage';

export default function MediaPage() {
    return <OperationsPage
                           permission="MEDIA_VIEW" activeResource="media"><MediaPanel/></OperationsPage>;
}
