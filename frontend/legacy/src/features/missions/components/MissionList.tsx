'use client';

import Link from 'next/link';
import { CalendarClock, MapPin, Plus, RefreshCw } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner } from '@/components/ui';
import { Mission } from '../types/mission.types';
import { MissionStatusBadge } from './MissionStatusBadge';

export function MissionList({ missions, loading, error, search, setSearch, onRefresh, title = 'Mission của tôi', allowCreate = true }: { missions: Mission[]; loading: boolean; error: string | null; search: string; setSearch: (value: string) => void; onRefresh: () => void; title?: string; allowCreate?: boolean }) {
  return <Card>
    <CardHeader className="border-b border-slate-100 flex-row items-center justify-between gap-4"><CardTitle>{title}</CardTitle><div className="flex gap-2"><Input aria-label="Tìm mission" placeholder="Mã hoặc tiêu đề" value={search} onChange={(event) => setSearch(event.target.value)} /><Button size="sm" variant="outline" onClick={onRefresh} leftIcon={<RefreshCw size={15} />}>Làm mới</Button>{allowCreate && <Link href="/missions/create"><Button size="sm" leftIcon={<Plus size={15} />}>Tạo mission</Button></Link>}</div></CardHeader>
    <CardContent className="p-0">{loading ? <div className="min-h-48 flex items-center justify-center"><Spinner size="lg" /></div> : error ? <p className="p-6 text-error">{error}</p> : missions.length === 0 ? <p className="p-8 text-center text-secondary">Chưa có mission.</p> : <div className="divide-y divide-slate-100">{missions.map((mission) => <Link key={mission.id} href={`/missions/${mission.id}`} className="block p-5 hover:bg-slate-50 transition-colors"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-primary">{mission.code}</p><h3 className="font-semibold text-lg">{mission.title}</h3></div><MissionStatusBadge status={mission.status} /></div><div className="mt-3 flex flex-wrap gap-4 text-sm text-secondary"><span className="inline-flex items-center gap-1"><CalendarClock size={15} />{new Date(mission.startTime).toLocaleString('vi-VN')}</span><span className="inline-flex items-center gap-1"><MapPin size={15} />{mission.locationName}</span><span>{mission.missionType.replaceAll('_', ' ')}</span></div></Link>)}</div>}</CardContent>
  </Card>;
}
