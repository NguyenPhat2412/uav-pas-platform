'use client';
import { serviceName, displayLabel } from '@uav/ui/presentation';
import Link from 'next/link';
import { PageGuard } from '@/components/layout';
import { Panel, Button } from '@/components/ui';
import { useServices } from '@/features/customer/hooks';
import { useAuth } from '@/contexts/AuthContext';
export default function ServicesPage(){return <PageGuard><Services/></PageGuard>}
function Services(){const q=useServices();const {can}=useAuth();return <><div className="page-heading"><div><h1>Dịch vụ UAV</h1><p>Chọn dịch vụ phù hợp với nhu cầu của bạn.</p></div></div>{q.isLoading?<div className="empty" role="status">Đang tải danh mục dịch vụ…</div>:q.isError?<div className="error" role="alert">Không thể tải danh mục dịch vụ. <Button variant="secondary" onClick={()=>void q.refetch()}>Thử lại</Button></div>:<div className="grid grid-3">{(q.data??[]).map(service=><Panel key={service.id}><div className="service-card"><span className="muted">{displayLabel(service.code)}</span><h3>{serviceName(service)}</h3><p className="muted">{service.description||'Dịch vụ UAV theo yêu cầu.'}</p><span className="muted">Thời lượng mặc định: {service.defaultDurationMinutes} phút</span><div className="spacer"/>{can('MISSION_CREATE')&&<Link href={`/missions/create?serviceId=${service.id}`} className="button-link">Đặt dịch vụ này →</Link>}</div></Panel>)}</div>}{q.isSuccess&&!q.data.length&&<div className="empty">Hiện chưa có dịch vụ đang mở.</div>}</>}
