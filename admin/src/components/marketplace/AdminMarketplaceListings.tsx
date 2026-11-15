'use client';

import {useState} from 'react';
import {Boxes, CheckCircle2, PauseCircle, Search, Sparkles, XCircle} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, Spinner} from '@/components/ui';
import {useAdminListings, useModerateListing} from '@/hooks/marketplace/useAdminMarketplace';
import type {ListingModerationStatus} from '@/types/marketplace/marketplace.types';

function formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0))} ₫`;
}

export function AdminMarketplaceListings() {
    const [status, setStatus] = useState<ListingModerationStatus | ''>('');
    const [keyword, setKeyword] = useState('');
    const [noteById, setNoteById] = useState<Record<number, string>>({});
    const [featuredById, setFeaturedById] = useState<Record<number, boolean>>({});

    const query = useAdminListings(status, keyword);
    const moderate = useModerateListing();
    const listings = query.data?.content ?? [];

    const handleModerate = (id: number, nextStatus: ListingModerationStatus, currentFeatured: boolean) => {
        moderate.mutate({
            id,
            payload: {
                status: nextStatus,
                moderationNote: noteById[id]?.trim() || undefined,
                featured: featuredById[id] ?? currentFeatured,
            },
        });
    };

    return (
        <div className="space-y-4 p-4 sm:p-6">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
                            <Boxes size={20} className="text-primary" aria-hidden="true"/>
                            Kiểm duyệt Tin đăng Dịch vụ & Thiết bị UAV
                        </CardTitle>
                        <p className="m-0 mt-1 text-xs text-muted">
                            Phê duyệt tin đăng của đối tác lên trang dịch vụ công khai, gắn nhãn nổi bật hoặc tạm ẩn tin vi phạm.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="relative">
                            <span className="sr-only">Tìm tiêu đề tin đăng hoặc tỉnh thành</span>
                            <Search size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                            <input
                                type="search"
                                aria-label="Tìm tiêu đề tin đăng hoặc tỉnh thành"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                placeholder="Tìm tiêu đề, tỉnh thành..."
                                className="h-9 rounded-control border border-border bg-white pr-3 pl-8 text-xs font-medium text-foreground"
                            />
                        </label>
                        <select
                            aria-label="Lọc trạng thái kiểm duyệt tin đăng"
                            value={status}
                            onChange={e => setStatus(e.target.value as ListingModerationStatus | '')}
                            className="h-9 rounded-control border border-border bg-white px-3 text-xs font-semibold"
                        >
                            <option value="">Tất cả trạng thái ({query.data?.totalElements ?? 0})</option>
                            <option value="PENDING_REVIEW">Chờ duyệt</option>
                            <option value="PUBLISHED">Đang hiển thị</option>
                            <option value="PAUSED">Đang tạm ẩn</option>
                            <option value="REJECTED">Từ chối</option>
                        </select>
                    </div>
                </CardHeader>
                {moderate.isError && (
                    <div className="px-5 pt-2">
                        <Alert variant="error" role="alert" className="text-xs">
                            {moderate.error instanceof Error
                                ? moderate.error.message
                                : 'Không thể kiểm duyệt tin đăng. Vui lòng kiểm tra trạng thái KYC của đối tác.'}
                        </Alert>
                    </div>
                )}
                <CardContent className="divide-y divide-border p-0">
                    {query.isLoading ? (
                        <div className="flex justify-center p-10" role="status"><Spinner size="lg"/></div>
                    ) : listings.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted" role="status">Không có tin đăng nào phù hợp bộ lọc.</div>
                    ) : (
                        listings.map(item => {
                            const isFeatured = featuredById[item.id] ?? item.featured;
                            return (
                                <div key={item.id} className="space-y-3 p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <strong className="text-base font-extrabold text-slate-900">{item.title}</strong>
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                                                    {item.listingType}
                                                </span>
                                                <span
                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                        item.moderationStatus === 'PUBLISHED'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : item.moderationStatus === 'PENDING_REVIEW'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {item.moderationStatus}
                                                </span>
                                            </div>
                                            <p className="m-0 mt-1 text-xs text-slate-600">
                                                Đơn vị: <strong>{item.providerDisplayName}</strong> · Khu vực: {item.province} ({item.serviceRadiusKm} km) · Đã đặt: {item.bookingCount} lần
                                            </p>
                                            {item.equipmentSpecs && (
                                                <p className="m-0 mt-0.5 text-xs text-slate-500">Thiết bị: {item.equipmentSpecs}</p>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <strong className="text-base font-black text-primary">
                                                {formatVnd(Number(item.basePriceVnd))}
                                            </strong>
                                            <span className="block text-xs text-slate-500">{item.pricingModel}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                                        <div className="flex flex-1 flex-wrap items-center gap-3">
                                            <input
                                                type="text"
                                                aria-label={`Ghi chú kiểm duyệt cho ${item.title}`}
                                                value={noteById[item.id] ?? item.moderationNote ?? ''}
                                                onChange={e => setNoteById(s => ({...s, [item.id]: e.target.value}))}
                                                placeholder="Ghi chú kiểm duyệt..."
                                                className="h-9 min-w-[220px] flex-1 rounded-control border border-slate-300 bg-white px-3 text-xs"
                                            />
                                            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={isFeatured}
                                                    onChange={e => setFeaturedById(s => ({...s, [item.id]: e.target.checked}))}
                                                    className="h-4 w-4 accent-primary"
                                                />
                                                <Sparkles size={13} className="text-amber-500" aria-hidden="true"/>
                                                Ưu tiên nổi bật
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button size="sm" disabled={moderate.isPending} leftIcon={<CheckCircle2 size={14} aria-hidden="true"/>} onClick={() => handleModerate(item.id, 'PUBLISHED', item.featured)}>
                                                Xuất bản lên sàn
                                            </Button>
                                            <Button size="sm" variant="outline" disabled={moderate.isPending} leftIcon={<PauseCircle size={14} aria-hidden="true"/>} onClick={() => handleModerate(item.id, 'PAUSED', item.featured)}>
                                                Tạm ẩn
                                            </Button>
                                            <Button size="sm" variant="danger" disabled={moderate.isPending} leftIcon={<XCircle size={14} aria-hidden="true"/>} onClick={() => handleModerate(item.id, 'REJECTED', item.featured)}>
                                                Từ chối
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
