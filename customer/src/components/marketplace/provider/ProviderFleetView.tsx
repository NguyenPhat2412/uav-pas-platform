'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Cpu, Plane, Plus} from 'lucide-react';
import {Button} from '@/components/customer/CustomerUi';
import {OptionalMark, RequiredMark} from '@/components/ui';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {useMyProviderFleet, useMyProviderProfile, useProviderFleetActions} from '@/hooks/marketplace/useMarketplace';
import {EQUIPMENT_CATEGORY_OPTIONS, extractActionableError, initialEquipmentForm, initialUavForm} from '@/forms/marketplace/marketplace-forms';
import type {ProviderEquipmentCategory} from '@/types/marketplace/marketplace.types';

const INPUT_CLASS = 'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary';

export default function ProviderFleetView() {
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const fleetQuery = useMyProviderFleet(Boolean(profile));
    const {registerUav, registerEquipment} = useProviderFleetActions();

    const [uavForm, setUavForm] = useState(initialUavForm);
    const [eqForm, setEqForm] = useState(initialEquipmentForm);
    const [errorMsg, setErrorMsg] = useState('');

    const uavs = fleetQuery.data?.uavs ?? [];
    const equipment = fleetQuery.data?.equipment ?? [];

    const handleCreateUav = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!uavForm.model.trim() || !uavForm.serialNumber.trim()) {
            setErrorMsg('Vui lòng nhập đầy đủ Model và Số Serial của tàu bay UAV.');
            return;
        }
        try {
            await registerUav.mutateAsync({
                model: uavForm.model.trim(),
                serialNumber: uavForm.serialNumber.trim(),
                manufacturer: uavForm.manufacturer.trim() || 'DJI Enterprise',
            });
            setUavForm(initialUavForm());
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể đăng ký tàu bay UAV (kiểm tra trùng số Serial).'));
        }
    };

    const handleCreateEquipment = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        if (!eqForm.name.trim()) {
            setErrorMsg('Vui lòng nhập tên cảm biến hoặc phụ kiện.');
            return;
        }
        try {
            await registerEquipment.mutateAsync({
                ...eqForm,
                name: eqForm.name.trim(),
                serialNumber: eqForm.serialNumber?.trim() || undefined,
            });
            setEqForm(initialEquipmentForm());
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể đăng ký thiết bị / payload.'));
        }
    };

    return (
        <ProviderStudioShell
            title="Đội bay UAV & Thiết bị chuyên dụng của Đối tác (3P Fleet)"
            subtitle="Khai báo máy bay UAV và cảm biến thuộc sở hữu của bạn để gán trực tiếp khi nhận đơn hàng trên sàn."
        >
            {!profileQuery.isLoading && !profile ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center" role="status">
                    <p className="m-0 text-sm font-bold text-slate-900">Vui lòng khởi tạo Hồ sơ Đối tác trước khi khai báo đội bay.</p>
                    <Link href="/customer/provider/onboarding" className="mt-3 inline-flex h-9 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground">
                        Đăng ký Đối tác →
                    </Link>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-6">
                    {errorMsg && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-danger" role="alert">
                            {errorMsg}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                            <h2 className="m-0 flex items-center gap-2 text-base font-extrabold text-slate-900">
                                <Plane size={18} className="text-primary" aria-hidden="true"/>
                                Tàu bay UAV sở hữu ({uavs.length})
                            </h2>

                            <form onSubmit={handleCreateUav} className="grid grid-cols-1 items-end gap-2.5 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-3">
                                <label className="grid gap-1 text-xs font-bold text-slate-700">
                                    <span>Model tàu bay<RequiredMark/></span>
                                    <input required aria-label="Model tàu bay UAV" className={INPUT_CLASS} value={uavForm.model} onChange={e => setUavForm(s => ({...s, model: e.target.value}))} placeholder="VD: Matrice 350"/>
                                </label>
                                <label className="grid gap-1 text-xs font-bold text-slate-700">
                                    <span>Số Serial<RequiredMark/></span>
                                    <input required aria-label="Số Serial tàu bay UAV" className={INPUT_CLASS} value={uavForm.serialNumber} onChange={e => setUavForm(s => ({...s, serialNumber: e.target.value}))} placeholder="Số Serial"/>
                                </label>
                                <div className="flex items-end gap-2">
                                    <label className="grid flex-1 gap-1 text-xs font-bold text-slate-700">
                                        <span>Hãng sản xuất<RequiredMark/></span>
                                        <input required aria-label="Hãng sản xuất UAV" className={INPUT_CLASS} value={uavForm.manufacturer} onChange={e => setUavForm(s => ({...s, manufacturer: e.target.value}))} placeholder="Hãng SX"/>
                                    </label>
                                    <Button type="submit" disabled={registerUav.isPending} aria-label="Thêm tàu bay UAV">
                                        <Plus size={14} aria-hidden="true"/>
                                    </Button>
                                </div>
                            </form>

                            {uavs.length === 0 ? (
                                <p className="m-0 text-xs text-slate-500">Chưa có tàu bay UAV nào được đăng ký.</p>
                            ) : (
                                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                                    {uavs.map(uav => (
                                        <li key={uav.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                                            <div>
                                                <strong className="font-bold text-slate-900">{uav.model}</strong>
                                                <span className="ml-2 font-mono text-slate-500">SN: {uav.serialNumber}</span>
                                                <span className="ml-2 text-slate-400">({uav.manufacturer})</span>
                                            </div>
                                            <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-800">{uav.status}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
                            <h2 className="m-0 flex items-center gap-2 text-base font-extrabold text-slate-900">
                                <Cpu size={18} className="text-uav-blue" aria-hidden="true"/>
                                Cảm biến, Payload & Phụ kiện ({equipment.length})
                            </h2>

                            <form onSubmit={handleCreateEquipment} className="grid grid-cols-1 items-end gap-2.5 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2">
                                <label className="grid gap-1 text-xs font-bold text-slate-700">
                                    <span>Tên cảm biến / phụ kiện<RequiredMark/></span>
                                    <input required aria-label="Tên cảm biến hoặc phụ kiện" className={INPUT_CLASS} value={eqForm.name} onChange={e => setEqForm(s => ({...s, name: e.target.value}))} placeholder="VD: Zenmuse L2 LiDAR"/>
                                </label>
                                <label className="grid gap-1 text-xs font-bold text-slate-700">
                                    <span>Nhóm thiết bị<RequiredMark/></span>
                                    <select aria-label="Nhóm thiết bị" className={INPUT_CLASS} value={eqForm.type} onChange={e => setEqForm(s => ({...s, type: e.target.value as ProviderEquipmentCategory}))}>
                                        {EQUIPMENT_CATEGORY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="grid gap-1 text-xs font-bold text-slate-700">
                                    <span>Số Serial<OptionalMark/></span>
                                    <input aria-label="Số Serial thiết bị" className={INPUT_CLASS} value={eqForm.serialNumber ?? ''} onChange={e => setEqForm(s => ({...s, serialNumber: e.target.value}))} placeholder="Số Serial"/>
                                </label>
                                <div className="flex items-end gap-2">
                                    <label className="grid flex-1 gap-1 text-xs font-bold text-slate-700">
                                        <span>Số lượng<RequiredMark/></span>
                                        <input type="number" min={1} aria-label="Số lượng thiết bị" className={INPUT_CLASS} value={eqForm.quantity} onChange={e => setEqForm(s => ({...s, quantity: Number(e.target.value)}))} placeholder="Số lượng"/>
                                    </label>
                                    <Button type="submit" disabled={registerEquipment.isPending} aria-label="Thêm thiết bị hoặc cảm biến">
                                        <Plus size={14} aria-hidden="true"/>
                                    </Button>
                                </div>
                            </form>

                            {equipment.length === 0 ? (
                                <p className="m-0 text-xs text-slate-500">Chưa có payload hoặc phụ kiện nào.</p>
                            ) : (
                                <ul className="m-0 list-none divide-y divide-slate-100 p-0">
                                    {equipment.map(eq => (
                                        <li key={eq.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                                            <div>
                                                <strong className="font-bold text-slate-900">{eq.name}</strong>
                                                <span className="ml-2 text-slate-500">({EQUIPMENT_CATEGORY_OPTIONS.find(c => c.value === eq.type)?.label ?? eq.type})</span>
                                            </div>
                                            <span className="font-semibold text-slate-700">Khả dụng: {eq.availableQuantity}/{eq.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </ProviderStudioShell>
    );
}
