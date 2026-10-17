'use client';
import { MediaPanel } from '@/features/operations/components/MediaPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function MediaPage() { return <OperationsPage title="Tệp và tài liệu" meta="Quản lý tệp, hình ảnh và tài liệu phục vụ vận hành." permission="MEDIA_READ" activeResource="media"><MediaPanel /></OperationsPage>; }
