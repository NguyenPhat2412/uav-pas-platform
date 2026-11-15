'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {CheckCircle2, Lock, ShieldCheck, Sparkles} from 'lucide-react';
import {MarketplaceFilterBar} from '@/components/marketplace/MarketplaceFilterBar';
import {MarketplaceListingCard} from '@/components/marketplace/MarketplaceListingCard';
import {usePublicListings} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import type {ListingSortOption, ListingType, PricingModel} from '@/types/marketplace/marketplace.types';
import type {MissionType} from '@/types/mission/mission.types';

export function PublicMarketplaceCatalog({mode = 'public'}: { mode?: 'public' | 'portal' }) {
    const {rfqEnabled, invoiceDueDays} = useSiteInfo();
    const [keyword, setKeyword] = useState('');
    const [listingType, setListingType] = useState<ListingType | ''>('');
    const [missionType, setMissionType] = useState<MissionType | ''>('');
    const [pricingModel, setPricingModel] = useState<PricingModel | ''>('');
    const [province, setProvince] = useState('');
    const [sortBy, setSortBy] = useState<ListingSortOption>('featured');
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const type = params.get('type') as ListingType | null;
        const mission = params.get('mission') as MissionType | null;
        const pricing = params.get('pricing') as PricingModel | null;
        const prov = params.get('province');
        const sort = params.get('sort') as ListingSortOption | null;
        if (q) setKeyword(q);
        if (type) setListingType(type);
        if (mission) setMissionType(mission);
        if (pricing) setPricingModel(pricing);
        if (prov) setProvince(prov);
        if (sort) setSortBy(sort);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const sync = (k: string, v: string) => (v ? params.set(k, v) : params.delete(k));
        sync('q', keyword);
        sync('type', listingType);
        sync('mission', missionType);
        sync('pricing', pricingModel);
        sync('province', province);
        sync('sort', sortBy === 'featured' ? '' : sortBy);
        const qs = params.toString();
        window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }, [keyword, listingType, missionType, pricingModel, province, sortBy]);

    const query = usePublicListings({keyword, listingType, missionType, pricingModel, province, sortBy, page, size: 12});
    const listings = query.data?.content ?? [];
    const totalElements = query.data?.totalElements ?? 0;
    const totalPages = query.data?.totalPages ?? 0;
    const hasFilters = Boolean(keyword || listingType || missionType || pricingModel || province || sortBy !== 'featured');

    const resetFilters = () => {
        setKeyword('');
        setListingType('');
        setMissionType('');
        setPricingModel('');
        setProvince('');
        setSortBy('featured');
        setPage(0);
    };

    return (
        <section className={mode === 'public' ? 'border-b border-border bg-white py-10 sm:py-14' : 'border-b border-slate-200 bg-white p-4 sm:p-5'}>
            <div className={mode === 'public' ? 'mx-auto w-full max-w-[1380px] space-y-6 px-5 sm:px-8 lg:px-12' : 'space-y-5'}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary">
                            <Sparkles size={14} aria-hidden="true"/>
                            Sàn Giao dịch Dịch vụ & Thiết bị UAV
                        </span>
                        <h2 className="m-0 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                            Thuê dịch vụ bay hoặc thiết bị từ Đội bay UAV PAS & Đối tác xác minh
                        </h2>
                        <p className="m-0 text-xs text-slate-600 sm:text-sm">
                            Đặt thuê trực tiếp theo đơn giá niêm yết hoặc mở yêu cầu nhận báo giá cạnh tranh, bảo vệ thanh toán ký quỹ qua VietQR.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        {rfqEnabled && (
                            <Link
                                href="/customer/missions/create?rfq=1"
                                className="inline-flex h-10 items-center justify-center rounded-control border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 transition-colors hover:border-primary hover:text-primary"
                            >
                                Đăng yêu cầu nhận báo giá (RFQ)
                            </Link>
                        )}
                        <Link
                            href="/customer/provider/onboarding"
                            className="inline-flex h-10 items-center justify-center rounded-control bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                        >
                            Đăng dịch vụ của bạn lên sàn →
                        </Link>
                    </div>
                </div>

                {mode === 'portal' && (
                    <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/45 px-4 py-3 text-xs text-slate-700 sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                            <Lock size={15} className="shrink-0 text-emerald-700" aria-hidden="true"/>
                            <span><strong>Bảo vệ Ký quỹ VietQR:</strong> Chỉ giải ngân sau khi bạn nghiệm thu kết quả.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="shrink-0 text-emerald-700" aria-hidden="true"/>
                            <span><strong>Thẩm định KYC:</strong> Pháp nhân, chứng chỉ điều khiển & thiết bị minh bạch.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={15} className="shrink-0 text-primary" aria-hidden="true"/>
                            <span><strong>Đơn giá niêm yết rõ ràng:</strong> Hạn thanh toán linh hoạt {invoiceDueDays} ngày.</span>
                        </div>
                    </div>
                )}

                <MarketplaceFilterBar
                    totalElements={totalElements}
                    keyword={keyword}
                    listingType={listingType}
                    missionType={missionType}
                    pricingModel={pricingModel}
                    province={province}
                    sortBy={sortBy}
                    onKeywordChange={val => { setKeyword(val); setPage(0); }}
                    onListingTypeChange={val => { setListingType(val); setPage(0); }}
                    onMissionTypeChange={val => { setMissionType(val); setPage(0); }}
                    onPricingModelChange={val => { setPricingModel(val); setPage(0); }}
                    onProvinceChange={val => { setProvince(val); setPage(0); }}
                    onSortByChange={val => { setSortBy(val); setPage(0); }}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                        Hiển thị <strong className="font-bold text-slate-800">{listings.length}</strong> /{' '}
                        <strong className="font-bold text-slate-800">{totalElements}</strong> gói dịch vụ & thiết bị đang mở đặt
                    </span>
                    {hasFilters && (
                        <button type="button" onClick={resetFilters} className="font-bold text-primary hover:underline">
                            Xoá bộ lọc
                        </button>
                    )}
                </div>

                {query.isLoading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Đang tải danh sách gói dịch vụ">
                        {[0, 1, 2].map(idx => (
                            <div key={idx} className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/70"/>
                        ))}
                    </div>
                ) : query.isError ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-danger" role="alert">
                        <span>Không thể tải danh sách gói dịch vụ trên sàn. Vui lòng thử lại.</span>
                        <button type="button" onClick={() => void query.refetch()} className="rounded-control border border-rose-300 bg-white px-3 py-1.5 font-bold text-danger">
                            Tải lại
                        </button>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center" role="status">
                        <p className="m-0 text-sm font-bold text-slate-800">Chưa có gói dịch vụ khớp bộ lọc hiện tại.</p>
                        <p className="m-0 mt-1 text-xs text-slate-500">
                            Bạn có thể xoá bộ lọc hoặc gửi yêu cầu mở (RFQ) để các đối tác UAV chủ động chào giá.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {listings.map(item => <MarketplaceListingCard key={item.id} item={item}/>)}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                            type="button"
                            disabled={page <= 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="h-9 rounded-control border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                        >
                            ← Trang trước
                        </button>
                        <span className="text-xs font-semibold text-slate-600">Trang {page + 1} / {totalPages}</span>
                        <button
                            type="button"
                            disabled={page + 1 >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="h-9 rounded-control border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 disabled:opacity-40"
                        >
                            Trang sau →
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
