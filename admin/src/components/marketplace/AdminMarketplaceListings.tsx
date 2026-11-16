'use client';

import {useState} from 'react';
import {Boxes, CheckCircle2, PauseCircle, Search, Sparkles, XCircle} from 'lucide-react';
import {Alert, Button, Card, CardContent, CardHeader, CardTitle, OptionalMark, Spinner} from '@/components/ui';
import {useAdminListings, useModerateListing} from '@/hooks/marketplace/useAdminMarketplace';
import {buildListingModerationInput, formatMarketplaceVnd} from '@/forms/marketplace/admin-marketplace-form';
import type {ListingModerationStatus} from '@/types/marketplace/marketplace.types';

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
            payload: buildListingModerationInput({
                status: nextStatus,
                rawNote: noteById[id],
                featured: featuredById[id] ?? currentFeatured,
            }),
        });
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
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
                                className="h-9 rounded-control border border-border bg-card pr-3 pl-8 text-xs font-medium text-foreground"
                            />
                        </label>
                        <select
                            aria-label="Lọc trạng thái kiểm duyệt tin đăng"
                            value={status}
                            onChange={e => setStatus(e.target.value as ListingModerationStatus | '')}
                            className="h-9 rounded-control border border-border bg-card px-3 text-xs font-semibold tabular-nums"
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
                                                <strong className="text-base font-semibold text-on-surface">{item.title}</strong>
                                                <span className="rounded-badge bg-surface-container-low px-2 py-0.5 text-xs font-semibold text-on-surface">
                                                    {item.listingType}
                                                </span>
                                                <span
                                                    className={`rounded-badge px-2 py-0.5 text-xs font-semibold ${
                                                        item.moderationStatus === 'PUBLISHED'
                                                            ? 'bg-slate-900 text-white'
                                                            : item.moderationStatus === 'PENDING_REVIEW'
                                                              ? 'bg-amber-100 text-amber-800'
                                                              : 'bg-surface-container-low text-muted'
                                                    }`}
                                                >
                                                    {item.moderationStatus}
                                                </span>
                                            </div>
                                            <p className="m-0 mt-1 text-xs text-muted tabular-nums">
                                                Đơn vị: <strong className="text-on-surface">{item.providerDisplayName}</strong> · Khu vực: {item.province} ({item.serviceRadiusKm} km) · Đã đặt: {item.bookingCount} lần
                                            </p>
                                            {item.equipmentSpecs && (
                                                <p className="m-0 mt-0.5 text-xs text-muted">Thiết bị: {item.equipmentSpecs}</p>
                                            )}
                                        </div>

                                        <div className="text-right tabular-nums">
                                            <strong className="text-base font-semibold text-on-surface">
                                                {formatMarketplaceVnd(Number(item.basePriceVnd))}
                                            </strong>
                                            <span className="block text-xs text-muted">{item.pricingModel}</span>
                                        </div>
                                    </div>

                                    <div className="uav-bezel">
                                        <div className="uav-bezel-core flex flex-wrap items-end justify-between gap-3 p-3.5">
                                            <div className="flex flex-1 flex-wrap items-end gap-3">
                                                <label className="min-w-[220px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                                    <span className="block">Ghi chú kiểm duyệt<OptionalMark/></span>
                                                    <input
                                                        type="text"
                                                        aria-label={`Ghi chú kiểm duyệt cho ${item.title}`}
                                                        value={noteById[item.id] ?? item.moderationNote ?? ''}
                                                        onChange={e => setNoteById(s => ({...s, [item.id]: e.target.value}))}
                                                        placeholder="Ghi chú kiểm duyệt..."
                                                        className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                                                    />
                                                </label>
                                                <label className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-on-surface">
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
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
