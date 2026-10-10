'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageGuard } from '@/components/layout';
import { Button, Panel, Status } from '@/components/ui';
import { useMissions } from '@/features/customer/hooks';
export default function MissionsPage(){return <PageGuard><Missions/></PageGuard>}
function Missions(){const [search,setSearch]=useState('');const q=useMissions(search);return <><div className="page-heading"><div><h1>Mission của tôi</h1><p>Danh sách do backend trả về theo phạm vi sở hữu của tài khoản.</p></div><Link href="/missions/create"><Button>Tạo mission</Button></Link></div><Panel><div className="table-wrap"><div style={{paddingBottom:16}}><input aria-label="Tìm mission" className="field" style={{display:'block'}} placeholder="Tìm theo mã hoặc tiêu đề" value={search} onChange={e=>setSearch(e.target.value)}/></div>{q.isError?<div className="error">{q.error instanceof Error?q.error.message:'Không thể tải mission.'}</div>:q.isLoading?<div className="empty">Đang tải mission…</div>:q.data?.content.length?<table className="table"><thead><tr><th>Mã</th><th>Tiêu đề</th><th>Thời gian</th><th>Trạng thái</th></tr></thead><tbody>{q.data.content.map(m=><tr key={m.id}><td><Link href={`/missions/${m.id}`} className="button-link">{m.code}</Link></td><td>{m.title}</td><td>{new Date(m.startTime).toLocaleString('vi-VN')}</td><td><Status value={m.status}/></td></tr>)}</tbody></table>:<div className="empty">Bạn chưa có mission phù hợp.</div>}</div></Panel></>}
