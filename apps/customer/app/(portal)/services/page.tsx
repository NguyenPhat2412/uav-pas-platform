'use client';
import Link from 'next/link';
import { PageGuard } from '@/components/layout';
import { Panel } from '@/components/ui';
import { useServices } from '@/features/customer/hooks';
export default function ServicesPage(){return <PageGuard><Services/></PageGuard>}
function Services(){const q=useServices();return <><div className="page-heading"><div><h1>Dịch vụ UAV</h1><p>Danh mục active được cung cấp trực tiếp từ backend.</p></div></div>{q.isError?<div className="error">Không thể tải danh mục dịch vụ.</div>:<div className="grid grid-3">{(q.data??[]).map(service=><Panel key={service.id}><div className="service-card"><span className="muted">{service.code}</span><h3>{service.name}</h3><p className="muted">{service.description||'Dịch vụ UAV theo yêu cầu.'}</p><span className="muted">Thời lượng mặc định: {service.defaultDurationMinutes} phút</span><div className="spacer"/><Link href={`/missions/create?serviceId=${service.id}`} className="button-link">Đặt dịch vụ này →</Link></div></Panel>)}</div>}{!q.isLoading&&!q.data?.length&&<div className="empty">Chưa có dịch vụ active từ backend.</div>}</>}
