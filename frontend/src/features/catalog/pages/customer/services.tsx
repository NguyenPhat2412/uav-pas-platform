'use client';
import { UavIcon } from '@/components/shared/UavIcon';
import { serviceName } from '@/components/shared/presentation';
import Link from 'next/link';
import { ArrowUpRight, Camera, Clock3, Database, MapPinned, type LucideIcon } from 'lucide-react';
import { PageGuard } from '@/components/customer/layout';
import { Panel, Button } from '@/components/customer/ui';
import { useServices } from '@/lib/query/customer';
import { useAuth } from '@/contexts/AuthContext';
import styles from './services.module.css';

const serviceIcons: Record<string, LucideIcon | typeof UavIcon> = {
  UAV_RENTAL: UavIcon, AREA_INSPECTION: MapPinned, AERIAL_RECORDING: Camera, DATA_COLLECTION: Database,
};

export default function ServicesPage() { return <PageGuard><Services /></PageGuard>; }

function Services() {
  const q = useServices();
  const { can } = useAuth();
  return <>
    <div className="page-heading"><div><h1>Dịch vụ UAV</h1><p>Chọn dịch vụ phù hợp với nhu cầu của bạn.</p></div></div>
    {q.isLoading ? <div className="empty" role="status">Đang tải danh mục dịch vụ…</div>
      : q.isError ? <div className="error" role="alert">Không thể tải danh mục dịch vụ. <Button variant="secondary" onClick={() => void q.refetch()}>Thử lại</Button></div>
        : <div className={styles.grid}>{(q.data ?? []).map(service => {
          const Icon = serviceIcons[service.code] ?? UavIcon;
          return <Panel key={service.id}><div className={styles.card}>
            <span className={styles.icon}><Icon size={28} aria-hidden="true" /></span>
            <h2>{serviceName(service)}</h2>
            <p>{service.description || 'Dịch vụ UAV theo yêu cầu.'}</p>
            <div className={styles.duration}><Clock3 size={16} aria-hidden="true" /><span>Thời lượng mặc định: {service.defaultDurationMinutes} phút</span></div>
            {can('MISSION_CREATE') && <Link href={`/customer/missions/create?serviceId=${service.id}`} className={styles.action}>Đặt dịch vụ này<ArrowUpRight size={18} aria-hidden="true" /></Link>}
          </div></Panel>;
        })}</div>}
    {q.isSuccess && !q.data.length && <div className="empty">Hiện chưa có dịch vụ đang mở.</div>}
  </>;
}
