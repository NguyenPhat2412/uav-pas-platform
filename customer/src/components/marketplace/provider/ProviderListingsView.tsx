'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Edit3, Eye, PauseCircle, PlayCircle, Plus} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {ProviderListingForm} from '@/components/marketplace/provider/ProviderListingForm';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {useMyProviderListings, useMyProviderProfile, useProviderListingActions} from '@/hooks/useMarketplace';
import {useSiteInfo} from '@/hooks/useSiteInfo';
import {
    extractActionableError,
    formatVndCompact,
    initialListingForm,
    listingTypeLabel,
    moderationStatusLabel,
    pricingUnitLabel,
} from '@/forms/marketplace-forms';
import type {MarketplaceListing, MarketplaceListingUpsertInput} from '@/types/marketplace.types';

export default function ProviderListingsView() {
    const {defaultServiceRadiusKm} = useSiteInfo();
    const profileQuery = useMyProviderProfile();
    const listingsQuery = useMyProviderListings(Boolean(profileQuery.data));
    const {createListing, updateListing, togglePause} = useProviderListingActions();

    const profile = profileQuery.data;
    const listings = listingsQuery.data ?? [];

    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [form, setForm] = useState<MarketplaceListingUpsertInput>(() =>
        initialListingForm(profile?.province || 'Hà Nội', defaultServiceRadiusKm),
    );
    const [errorMsg, setErrorMsg] = useState('');

    const openCreate = () => {
        setErrorMsg('');
        setForm(initialListingForm(profile?.province || 'Hà Nội', profile?.serviceRadiusKm ?? defaultServiceRadiusKm));
        setEditingId('new');
    };

    const openEdit = (item: MarketplaceListing) => {
        setErrorMsg('');
        setForm({
            categoryServiceId: item.categoryServiceId ?? undefined,
            title: item.title,
            summary: item.summary ?? '',
            description: item.description ?? '',
            listingType: item.listingType,
            missionType: item.missionType,
            pricingModel: item.pricingModel,
            basePriceVnd: Number(item.basePriceVnd),
            minBookingUnits: Number(item.minBookingUnits || 1),
            securityDepositVnd: Number(item.securityDepositVnd || 0),
            province: item.province,
            serviceRadiusKm: item.serviceRadiusKm,
            equipmentSpecs: item.equipmentSpecs ?? '',
            deliverablesSummary: item.deliverablesSummary ?? '',
            onSiteSlaHours: item.onSiteSlaHours ?? 24,
            deliverySlaHours: item.deliverySlaHours ?? 48,
            coverImageUrl: item.coverImageUrl ?? '',
            submitForReview: true,
        });
        setEditingId(item.id);
    };

    const save = async (submitForReview: boolean) => {
        setErrorMsg('');
        if (!form.title.trim() || !form.province.trim()) {
            setErrorMsg('Vui lòng nhập đầy đủ Tiêu đề gói dịch vụ và Tỉnh/Thành phố phục vụ chính.');
            return;
        }
        const trimmedCover = form.coverImageUrl?.trim() || undefined;
        if (trimmedCover && !/^https?:\/\//i.test(trimmedCover)) {
            setErrorMsg('Đường dẫn ảnh đại diện tin đăng (nếu nhập) phải bắt đầu bằng http:// hoặc https://.');
            return;
        }
        try {
            const payload = {...form, title: form.title.trim(), province: form.province.trim(), coverImageUrl: trimmedCover, submitForReview};
            if (editingId === 'new') {
                await createListing.mutateAsync(payload);
            } else if (typeof editingId === 'number') {
                await updateListing.mutateAsync({id: editingId, payload});
            }
            setEditingId(null);
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể lưu tin đăng.'));
        }
    };

    return (
        <ProviderStudioShell
            title="Quản lý Tin đăng Dịch vụ & Cho thuê Thiết bị"
            subtitle="Đưa dịch vụ bay khảo sát, thuê UAV kèm phi công hoặc cho thuê thiết bị rời lên Sàn UAV PAS."
        >
            {!profileQuery.isLoading && !profile ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center" role="status">
                    <h2 className="m-0 text-base font-extrabold text-slate-900">Bạn chưa khởi tạo Hồ sơ Đối tác</h2>
                    <p className="m-0 mt-1 text-xs text-slate-600">
                        Vui lòng hoàn tất đăng ký thông tin đối tác & tài khoản nhận thanh toán trước khi đăng dịch vụ.
                    </p>
                    <Link href="/customer/provider/onboarding" className="mt-4 inline-flex h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground">
                        Đi tới Đăng ký Đối tác →
                    </Link>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-600">
                            Tổng cộng <strong className="text-slate-900">{listings.length}</strong> tin đăng của bạn
                        </span>
                        {editingId === null && (
                            <Button onClick={openCreate}>
                                <Plus size={15} className="mr-1 inline" aria-hidden="true"/>
                                Tạo tin đăng dịch vụ / cho thuê mới
                            </Button>
                        )}
                    </div>

                    {(errorMsg || togglePause.isError) && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-danger" role="alert">
                            {errorMsg || extractActionableError(togglePause.error, 'Không thể cập nhật trạng thái hiển thị của tin đăng.')}
                        </div>
                    )}

                    {editingId !== null && (
                        <ProviderListingForm
                            editingId={editingId}
                            form={form}
                            setForm={setForm}
                            defaultServiceRadiusKm={defaultServiceRadiusKm}
                            isSaving={createListing.isPending || updateListing.isPending}
                            onSave={submit => void save(submit)}
                            onClose={() => setEditingId(null)}
                        />
                    )}

                    {listings.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500" role="status">
                            Bạn chưa có tin đăng nào. Nhấn <strong>“Tạo tin đăng dịch vụ / cho thuê mới”</strong> để bắt đầu kinh doanh trên sàn.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {listings.map(item => (
                                <article key={item.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                                                {listingTypeLabel(item.listingType)}
                                            </span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.moderationStatus === 'PUBLISHED' ? 'bg-slate-900 text-white' : item.moderationStatus === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-800' : item.moderationStatus === 'REJECTED' ? 'bg-rose-100 text-danger' : 'bg-slate-100 text-slate-700'}`}>
                                                {moderationStatusLabel(item.moderationStatus)}
                                            </span>
                                        </div>
                                        <h3 className="m-0 text-base font-extrabold text-slate-900">{item.title}</h3>
                                        <p className="m-0 text-xs text-slate-600">
                                            {item.province} · Bán kính {item.serviceRadiusKm} km · Đã đặt {item.bookingCount} lần
                                        </p>
                                        {item.moderationNote && (
                                            <p className="m-0 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900">Ghi chú kiểm duyệt: {item.moderationNote}</p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                        <div>
                                            <strong className="text-base font-black text-primary">{formatVndCompact(item.basePriceVnd)}</strong>
                                            <span className="ml-1 text-xs text-slate-500">/ {pricingUnitLabel(item.pricingModel)}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.moderationStatus === 'PUBLISHED' && (
                                                <Link href={`/services/${item.slug}`} target="_blank" className="inline-flex h-8 items-center gap-1 rounded-control border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary">
                                                    <Eye size={13} aria-hidden="true"/> Xem
                                                </Link>
                                            )}
                                            <button type="button" onClick={() => openEdit(item)} className="inline-flex h-8 items-center gap-1 rounded-control border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary">
                                                <Edit3 size={13} aria-hidden="true"/> Sửa
                                            </button>
                                            {(item.moderationStatus === 'PUBLISHED' || item.moderationStatus === 'PAUSED') && (
                                                <button type="button" onClick={() => togglePause.mutate(item.id)} className="inline-flex h-8 items-center gap-1 rounded-control border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                    {item.moderationStatus === 'PUBLISHED' ? <><PauseCircle size={13} aria-hidden="true"/> Tạm ẩn</> : <><PlayCircle size={13} aria-hidden="true"/> Mở lại</>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </ProviderStudioShell>
    );
}
