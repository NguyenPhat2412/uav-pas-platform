'use client';

import {useState} from 'react';
import {Button} from '@/components/customer/CustomerUi';
import {OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderDocumentsSection} from '@/components/marketplace/provider/ProviderDocumentsSection';
import {ProviderKycReadinessCard} from '@/components/marketplace/provider/ProviderKycReadinessCard';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {useMyProviderProfile, useProviderOnboardingActions} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {extractActionableError, initialOnboardingForm} from '@/forms/marketplace/marketplace-forms';
import type {ProviderOnboardingInput, ProviderProfile, ProviderType} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS =
    'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary';

export default function ProviderOnboardingView() {
    const profileQuery = useMyProviderProfile();
    return (
        <ProviderStudioShell
            title="Hồ sơ Năng lực & Xác minh KYC Đối tác"
            subtitle="Đăng ký thông tin pháp lý, chứng chỉ bay và tài khoản ngân hàng để đăng dịch vụ lên sàn UAV PAS."
        >
            {profileQuery.isLoading ? (
                <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" role="status" aria-label="Đang tải hồ sơ đối tác"/>
            ) : (
                <OnboardingContent key={profileQuery.data?.id ?? 'new'} profile={profileQuery.data ?? null}/>
            )}
        </ProviderStudioShell>
    );
}

function OnboardingContent({profile}: { profile: ProviderProfile | null }) {
    const {defaultServiceRadiusKm, platformFeeRate} = useSiteInfo();
    const {upsertProfile, addDocument, deleteDocument} = useProviderOnboardingActions();
    const [form, setForm] = useState<ProviderOnboardingInput>(() =>
        initialOnboardingForm(profile, defaultServiceRadiusKm),
    );
    const [savedBanner, setSavedBanner] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const step1Done = Boolean(form.displayName.trim() && form.province.trim());
    const step2Done = Boolean(form.bankName?.trim() && form.bankAccountNumber?.trim() && form.bankAccountHolder?.trim());
    const step3Done = Boolean((profile?.documents?.length ?? 0) > 0);

    const saveProfile = async (submitForReview: boolean) => {
        setSavedBanner('');
        setErrorMsg('');
        if (!form.displayName.trim() || !form.province.trim()) {
            setErrorMsg('Vui lòng nhập đầy đủ Tên thương hiệu và Tỉnh/Thành phố đặt trạm chính.');
            return;
        }
        try {
            await upsertProfile.mutateAsync({...form, submitForReview});
            setSavedBanner(
                submitForReview
                    ? 'Đã gửi hồ sơ KYC tới Ban quản trị UAV PAS xét duyệt!'
                    : 'Đã lưu bản nháp hồ sơ đối tác.',
            );
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể lưu hồ sơ đối tác.'));
        }
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <ProviderKycReadinessCard
                profile={profile}
                platformFeeRate={platformFeeRate}
                step1Done={step1Done}
                step2Done={step2Done}
                step3Done={step3Done}
            />

            {savedBanner && (
                <div className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-900" role="status">
                    {savedBanner}
                </div>
            )}
            {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-danger" role="alert">
                    {errorMsg}
                </div>
            )}

            <form
                onSubmit={e => { e.preventDefault(); void saveProfile(true); }}
                className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
            >
                <h2 className="m-0 text-base font-extrabold text-slate-900">1. Thông tin Thương hiệu & Khu vực hoạt động</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                        <span>Tên thương hiệu / Đơn vị cung cấp<RequiredMark/></span>
                        <input required className={INPUT_CLASS} value={form.displayName} onChange={e => setForm(s => ({...s, displayName: e.target.value}))} placeholder="VD: SkySurvey Miền Bắc JSC"/>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                        <span>Loại hình đối tác<RequiredMark/></span>
                        <select className={INPUT_CLASS} value={form.providerType} onChange={e => setForm(s => ({...s, providerType: e.target.value as ProviderType}))}>
                            <option value="COMPANY">Doanh nghiệp / Pháp nhân</option>
                            <option value="INDIVIDUAL">Phi công / Chuyên gia cá nhân</option>
                        </select>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                        <span>Mã số thuế / Số CCCD đại diện<OptionalMark/></span>
                        <input className={INPUT_CLASS} value={form.taxOrIdNumber ?? ''} onChange={e => setForm(s => ({...s, taxOrIdNumber: e.target.value}))} placeholder="0109xxxxxx"/>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                        <span>Số chứng chỉ điều khiển / Giấy phép bay<OptionalMark/></span>
                        <input className={INPUT_CLASS} value={form.flightLicenseNumber ?? ''} onChange={e => setForm(s => ({...s, flightLicenseNumber: e.target.value}))} placeholder="VN-UAV-CERT-2026"/>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                        <span>Tỉnh / Thành phố đặt trạm chính<RequiredMark/></span>
                        <input required className={INPUT_CLASS} value={form.province} onChange={e => setForm(s => ({...s, province: e.target.value}))} placeholder="Hà Nội, Đà Nẵng, TP. Hồ Chí Minh..."/>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                        <span>Bán kính cơ động phục vụ (km)<OptionalMark/></span>
                        <input type="number" min={5} max={2000} className={INPUT_CLASS} value={form.serviceRadiusKm ?? defaultServiceRadiusKm} onChange={e => setForm(s => ({...s, serviceRadiusKm: Number(e.target.value)}))}/>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                        <span>Số điện thoại điều phối trực tiếp<OptionalMark/></span>
                        <input className={INPUT_CLASS} value={form.contactPhone ?? ''} onChange={e => setForm(s => ({...s, contactPhone: e.target.value}))} placeholder="09xx xxx xxx"/>
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                        <span>Giới thiệu năng lực đội bay & Kinh nghiệm thực địa<OptionalMark/></span>
                        <textarea rows={3} className="w-full rounded-control border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 outline-none focus:border-primary" value={form.bio ?? ''} onChange={e => setForm(s => ({...s, bio: e.target.value}))} placeholder="Mô tả dòng máy bay sở hữu (Matrice 350, Mavic 3E, LiDAR...), kinh nghiệm khảo sát..."/>
                    </label>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <h2 className="m-0 text-base font-extrabold text-slate-900">2. Tài khoản Ngân hàng nhận giải ngân Ký quỹ (Payout)</h2>
                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                            <span>Ngân hàng thụ hưởng<OptionalMark/></span>
                            <input className={INPUT_CLASS} value={form.bankName ?? ''} onChange={e => setForm(s => ({...s, bankName: e.target.value}))} placeholder="Vietcombank, Techcombank, MB..."/>
                        </label>
                        <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                            <span>Số tài khoản<OptionalMark/></span>
                            <input className={INPUT_CLASS} value={form.bankAccountNumber ?? ''} onChange={e => setForm(s => ({...s, bankAccountNumber: e.target.value}))} placeholder="1903xxxxxxxx"/>
                        </label>
                        <label className="grid gap-1.5 text-xs font-bold text-slate-700">
                            <span>Chủ tài khoản (viết hoa không dấu)<OptionalMark/></span>
                            <input className={INPUT_CLASS} value={form.bankAccountHolder ?? ''} onChange={e => setForm(s => ({...s, bankAccountHolder: e.target.value}))} placeholder="CONG TY CP SKYSURVEY"/>
                        </label>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                    <Button type="button" variant="secondary" disabled={upsertProfile.isPending} onClick={() => void saveProfile(false)}>
                        Lưu bản nháp
                    </Button>
                    <Button type="submit" disabled={upsertProfile.isPending}>
                        {upsertProfile.isPending ? 'Đang gửi...' : 'Lưu & Gửi duyệt KYC Đối tác'}
                    </Button>
                </div>
            </form>

            <ProviderDocumentsSection
                profile={profile}
                isAdding={addDocument.isPending}
                onAddDocument={doc => addDocument.mutateAsync(doc)}
                onDeleteDocument={id => deleteDocument.mutate(id)}
                onError={setErrorMsg}
            />
        </div>
    );
}
