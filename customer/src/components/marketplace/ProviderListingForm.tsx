'use client';

import type {Dispatch, SetStateAction} from 'react';
import {Button} from '@/components/customer/CustomerUi';
import {LISTING_TYPE_OPTIONS, PRICING_MODEL_OPTIONS} from '@/forms/marketplace/marketplace-forms';
import {missionTypes} from '@/forms/mission/mission-form';
import {displayLabel} from '@/lib/presentation';
import type {ListingType, MarketplaceListingUpsertInput, PricingModel} from '@/types/marketplace/marketplace.types';
import type {MissionType} from '@/types/mission/mission.types';

const INPUT_CLASS =
    'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary';

export function ProviderListingForm({
    editingId,
    form,
    setForm,
    defaultServiceRadiusKm,
    isSaving,
    onSave,
    onClose,
}: {
    editingId: number | 'new';
    form: MarketplaceListingUpsertInput;
    setForm: Dispatch<SetStateAction<MarketplaceListingUpsertInput>>;
    defaultServiceRadiusKm: number;
    isSaving: boolean;
    onSave: (submitForReview: boolean) => void;
    onClose: () => void;
}) {
    return (
        <form
            onSubmit={e => { e.preventDefault(); onSave(true); }}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="m-0 text-base font-extrabold text-slate-900">
                    {editingId === 'new' ? 'Đăng dịch vụ / thiết bị mới lên sàn' : 'Cập nhật tin đăng'}
                </h2>
                <button type="button" onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-slate-900">
                    Đóng
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                    <span>Tiêu đề gói dịch vụ / thiết bị cho thuê *</span>
                    <input required className={INPUT_CLASS} value={form.title} onChange={e => setForm(s => ({...s, title: e.target.value}))} placeholder="VD: Khảo sát địa hình LiDAR Matrice 350 RTK miền Bắc"/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Ảnh đại diện (URL tuỳ chọn)</span>
                    <input type="url" className={INPUT_CLASS} value={form.coverImageUrl ?? ''} onChange={e => setForm(s => ({...s, coverImageUrl: e.target.value}))} placeholder="https://... (để trống dùng ảnh chuẩn UAV)"/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Hình thức cung ứng *</span>
                    <select className={INPUT_CLASS} value={form.listingType} onChange={e => setForm(s => ({...s, listingType: e.target.value as ListingType}))}>
                        {LISTING_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Nhóm nhiệm vụ chuẩn *</span>
                    <select className={INPUT_CLASS} value={form.missionType} onChange={e => setForm(s => ({...s, missionType: e.target.value as MissionType}))}>
                        {missionTypes.map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}
                    </select>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Đơn vị tính giá *</span>
                    <select className={INPUT_CLASS} value={form.pricingModel} onChange={e => setForm(s => ({...s, pricingModel: e.target.value as PricingModel}))}>
                        {PRICING_MODEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Đơn giá niêm yết (VNĐ) *</span>
                    <input required type="number" min={10000} step={10000} className={INPUT_CLASS} value={form.basePriceVnd} onChange={e => setForm(s => ({...s, basePriceVnd: Number(e.target.value)}))}/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Khối lượng đặt tối thiểu</span>
                    <input type="number" min={0.5} step={0.5} className={INPUT_CLASS} value={form.minBookingUnits ?? 1} onChange={e => setForm(s => ({...s, minBookingUnits: Number(e.target.value)}))}/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Tiền cọc thiết bị (VNĐ — nếu thuê rời)</span>
                    <input type="number" min={0} step={100000} className={INPUT_CLASS} value={form.securityDepositVnd ?? 0} onChange={e => setForm(s => ({...s, securityDepositVnd: Number(e.target.value)}))}/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Tỉnh / Thành phố phục vụ chính *</span>
                    <input required className={INPUT_CLASS} value={form.province} onChange={e => setForm(s => ({...s, province: e.target.value}))}/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Bán kính phục vụ (km)</span>
                    <input type="number" min={5} max={2000} className={INPUT_CLASS} value={form.serviceRadiusKm ?? defaultServiceRadiusKm} onChange={e => setForm(s => ({...s, serviceRadiusKm: Number(e.target.value)}))}/>
                </label>

                <div className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>SLA có mặt / bàn giao (giờ)</span>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" aria-label="Thời gian có mặt hiện trường (giờ)" min={1} max={720} className={INPUT_CLASS} value={form.onSiteSlaHours ?? 24} onChange={e => setForm(s => ({...s, onSiteSlaHours: Number(e.target.value)}))}/>
                        <input type="number" aria-label="Thời gian bàn giao dữ liệu (giờ)" min={1} max={720} className={INPUT_CLASS} value={form.deliverySlaHours ?? 48} onChange={e => setForm(s => ({...s, deliverySlaHours: Number(e.target.value)}))}/>
                    </div>
                </div>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700 sm:col-span-3">
                    <span>Tóm tắt ngắn hiển thị trên thẻ sàn</span>
                    <input className={INPUT_CLASS} value={form.summary ?? ''} onChange={e => setForm(s => ({...s, summary: e.target.value}))} placeholder="Độ chính xác cao, bàn giao bản đồ trực giao GeoTIFF + đám mây điểm LAS..."/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                    <span>Cấu hình máy bay UAV & Cảm biến sử dụng</span>
                    <input className={INPUT_CLASS} value={form.equipmentSpecs ?? ''} onChange={e => setForm(s => ({...s, equipmentSpecs: e.target.value}))} placeholder="VD: DJI Matrice 350 RTK + Zenmuse L2 LiDAR"/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                    <span>Sản phẩm bàn giao tiêu chuẩn</span>
                    <input className={INPUT_CLASS} value={form.deliverablesSummary ?? ''} onChange={e => setForm(s => ({...s, deliverablesSummary: e.target.value}))} placeholder="VD: GeoTIFF, DSM/DTM, LAS"/>
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-700 sm:col-span-3">
                    <span>Mô tả chi tiết quy trình thực hiện</span>
                    <textarea rows={3} className="w-full rounded-control border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 outline-none focus:border-primary" value={form.description ?? ''} onChange={e => setForm(s => ({...s, description: e.target.value}))}/>
                </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-3">
                <Button type="button" variant="secondary" onClick={() => onSave(false)}>Lưu nháp</Button>
                <Button type="submit" disabled={isSaving}>Lưu & Gửi duyệt hiển thị</Button>
            </div>
        </form>
    );
}
