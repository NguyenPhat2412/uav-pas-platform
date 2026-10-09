'use client';
import { MediaPanel } from '@/features/operations/components/MediaPanel';
import { OperationsPage } from '@/components/layout/OperationsPage';
export default function MediaPage() { return <OperationsPage title="Media" meta="Đăng ký, upload, xác nhận và tải media qua signed URL" permission="MEDIA_READ" activeResource="media"><MediaPanel /></OperationsPage>; }
