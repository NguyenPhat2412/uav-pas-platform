'use client';

import {useState} from 'react';
import {CheckCircle2, ExternalLink, FileText, PauseCircle, Search, ShieldCheck, XCircle} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, Spinner} from '@/components/ui';
import {useAdminProviders, useModerateProvider} from '@/hooks/marketplace/useAdminMarketplace';
import {usePlatformSettings} from '@/hooks/settings/useSettings';
import type {ProviderVerificationStatus} from '@/types/marketplace/marketplace.types';

export function AdminMarketplaceProviders() {
    const [status, setStatus] = useState<ProviderVerificationStatus | ''>('');
    const [keyword, setKeyword] = useState('');
    const [noteById, setNoteById] = useState<Record<number, string>>({});
    const [feePctById, setFeePctById] = useState<Record<number, string>>({});
    const [localError, setLocalError] = useState<string | null>(null);

    const query = useAdminProviders(status, keyword);
    const settingsQuery = usePlatformSettings();
    const moderate = useModerateProvider();
    const providers = query.data?.content ?? [];

    const configuredDefaultFeePct = (() => {
        const found = (settingsQuery.data ?? []).find(s => s.configKey === 'marketplace.platform_fee_rate');
        const rate = found ? Number(found.configValue) : 0.1;
        return Number.isFinite(rate) ? (rate * 100).toFixed(1) : '10.0';
    })();

    const handleModerate = (id: number, nextStatus: ProviderVerificationStatus) => {
        setLocalError(null);
        const rawFee = feePctById[id];
        let commissionRateOverride: number | undefined;
        if (rawFee !== undefined && rawFee.trim() !== '') {
            const pct = Number(rawFee);
            if (!Number.isFinite(pct) || pct < 0 || pct > 50) {
                setLocalError('Mức phí hoa hồng riêng của đối tác phải nằm trong khoảng từ 0% đến 50%.');
                return;
            }
            commissionRateOverride = pct / 100;
        }
        if ((nextStatus === 'REJECTED' || nextStatus === 'SUSPENDED') && !(noteById[id]?.trim())) {
            setLocalError('Vui lòng nhập ghi chú lý do khi yêu cầu bổ sung hồ sơ hoặc đình chỉ đối tác.');
            return;
        }
        moderate.mutate({
            id,
            payload: {status: nextStatus, reviewNote: noteById[id]?.trim() || undefined, commissionRateOverride},
        });
    };

    return (
        <div className="space-y-4 p-4 sm:p-6">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
                            <ShieldCheck size={20} className="text-primary" aria-hidden="true"/>
                            Thẩm định Hồ sơ Đối tác & KYC (3P Providers)
                        </CardTitle>
                        <p className="m-0 mt-1 text-xs text-muted">
                            Kiểm tra pháp nhân, chứng chỉ bay, tài khoản ngân hàng và cấu hình mức chiết khấu sàn riêng cho từng đối tác.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="relative">
                            <span className="sr-only">Tìm tên đối tác hoặc mã số thuế</span>
                            <Search size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                            <input
                                type="search"
                                aria-label="Tìm tên đối tác hoặc mã số thuế"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                placeholder="Tìm tên đối tác, MST..."
                                className="h-9 rounded-control border border-border bg-white pr-3 pl-8 text-xs font-medium text-foreground"
                            />
                        </label>
                        <select
                            aria-label="Lọc trạng thái xác minh đối tác"
                            value={status}
                            onChange={e => setStatus(e.target.value as ProviderVerificationStatus | '')}
                            className="h-9 rounded-control border border-border bg-white px-3 text-xs font-semibold"
                        >
                            <option value="">Tất cả trạng thái ({query.data?.totalElements ?? 0})</option>
                            <option value="PENDING_REVIEW">Chờ duyệt KYC</option>
                            <option value="VERIFIED">Đã xác minh</option>
                            <option value="REJECTED">Từ chối</option>
                            <option value="SUSPENDED">Tạm khoá</option>
                        </select>
                    </div>
                </CardHeader>
                {(localError || moderate.isError) && (
                    <div className="px-5 pt-2">
                        <Alert variant="error" role="alert" className="text-xs">
                            {localError ?? (moderate.error instanceof Error ? moderate.error.message : 'Không thể cập nhật trạng thái thẩm định đối tác.')}
                        </Alert>
                    </div>
                )}
                <CardContent className="divide-y divide-border p-0">
                    {query.isLoading ? (
                        <div className="flex justify-center p-10" role="status"><Spinner size="lg"/></div>
                    ) : providers.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted" role="status">Không có hồ sơ đối tác nào phù hợp bộ lọc.</div>
                    ) : (
                        providers.map(p => (
                            <div key={p.id} className="space-y-3 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong className="text-base font-extrabold text-slate-900">{p.displayName}</strong>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                                {p.providerType === 'COMPANY' ? 'Doanh nghiệp' : 'Cá nhân'}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : p.verificationStatus === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-danger'}`}>
                                                {p.verificationStatus}
                                            </span>
                                        </div>
                                        <p className="m-0 mt-1 text-xs text-slate-600">
                                            Tài khoản: <strong>{p.username || '1P Platform'}</strong> · Khu vực: {p.province} ({p.serviceRadiusKm} km)
                                            {p.taxOrIdNumber ? ` · MST/CCCD: ${p.taxOrIdNumber}` : ''}
                                            {p.flightLicenseNumber ? ` · Chứng chỉ bay: ${p.flightLicenseNumber}` : ''}
                                        </p>
                                        {p.bankAccountNumber && (
                                            <p className="m-0 mt-0.5 text-xs text-slate-600">
                                                Ngân hàng giải ngân: <strong>{p.bankName} · {p.bankAccountNumber} ({p.bankAccountHolder})</strong>
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-right text-xs text-slate-500">
                                        <div>Hoa hồng sàn: <strong className="text-primary">{p.commissionRateOverride != null ? `${(Number(p.commissionRateOverride) * 100).toFixed(1)}%` : `Mặc định (${configuredDefaultFeePct}%)`}</strong></div>
                                        <div>Hoàn thành: <strong>{p.completedMissionsCount}</strong> chuyến</div>
                                    </div>
                                </div>

                                {p.documents.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {p.documents.map(doc => {
                                            const safeHref = doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl) ? doc.fileUrl : null;
                                            return safeHref ? (
                                                <a key={doc.id} href={safeHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-primary hover:text-primary">
                                                    <FileText size={13} className="text-primary" aria-hidden="true"/>
                                                    <strong>{doc.title}</strong> ({doc.documentType})
                                                    <ExternalLink size={11} aria-hidden="true"/>
                                                </a>
                                            ) : (
                                                <span key={doc.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                                                    <FileText size={13} className="text-primary" aria-hidden="true"/>
                                                    <strong>{doc.title}</strong> ({doc.documentType})
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                                    <div className="flex flex-1 flex-wrap items-center gap-2">
                                        <input type="text" aria-label={`Ghi chú thẩm định đối tác ${p.displayName}`} value={noteById[p.id] ?? p.reviewNote ?? ''} onChange={e => setNoteById(s => ({...s, [p.id]: e.target.value}))} placeholder="Ghi chú thẩm định gửi đối tác..." className="h-9 min-w-[220px] flex-1 rounded-control border border-slate-300 bg-white px-3 text-xs"/>
                                        <input type="number" aria-label={`Tỷ lệ phí hoa hồng sàn cho ${p.displayName}`} min={0} max={50} step={0.5} value={feePctById[p.id] ?? (p.commissionRateOverride != null ? String(Number(p.commissionRateOverride) * 100) : '')} onChange={e => setFeePctById(s => ({...s, [p.id]: e.target.value}))} placeholder="Phí sàn % (VD: 10)" className="h-9 w-36 rounded-control border border-slate-300 bg-white px-3 text-xs"/>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button size="sm" disabled={moderate.isPending} leftIcon={<CheckCircle2 size={14} aria-hidden="true"/>} onClick={() => handleModerate(p.id, 'VERIFIED')}>Duyệt KYC</Button>
                                        <Button size="sm" variant="outline" disabled={moderate.isPending} leftIcon={<XCircle size={14} aria-hidden="true"/>} onClick={() => handleModerate(p.id, 'REJECTED')}>Yêu cầu bổ sung</Button>
                                        <Button size="sm" variant="danger" disabled={moderate.isPending} leftIcon={<PauseCircle size={14} aria-hidden="true"/>} onClick={() => handleModerate(p.id, 'SUSPENDED')}>Đình chỉ</Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
