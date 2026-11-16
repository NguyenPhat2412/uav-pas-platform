'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ProviderDirectOrderCard} from '@/components/marketplace/escrow/ProviderDirectOrderCard';
import {ProviderRfqSection} from '@/components/marketplace/provider/ProviderRfqSection';
import {ProviderStudioShell} from '@/components/marketplace/provider/ProviderStudioShell';
import {
    useMyProviderFleet,
    useMyProviderProfile,
    useMySubmittedBids,
    useOpenRfqMissions,
    useProviderOrderActions,
    useProviderOrders,
} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {extractActionableError} from '@/forms/marketplace/marketplace-forms';

export default function ProviderOrdersView() {
    const {rfqEnabled, requireEscrowBeforeStart} = useSiteInfo();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const ordersQuery = useProviderOrders(Boolean(profile));
    const rfqQuery = useOpenRfqMissions(Boolean(profile));
    const bidsQuery = useMySubmittedBids(Boolean(profile));
    const fleetQuery = useMyProviderFleet(Boolean(profile));
    const {respondToOrder, startOrder, completeOrder, submitBid} = useProviderOrderActions();

    const [activeTab, setActiveTab] = useState<'orders' | 'rfq'>('orders');
    const [selectedUavByMission, setSelectedUavByMission] = useState<Record<number, number>>({});
    const [handoverNoteByMission, setHandoverNoteByMission] = useState<Record<number, string>>({});
    const [errorMsg, setErrorMsg] = useState('');

    const orders = ordersQuery.data ?? [];
    const rfqs = rfqQuery.data ?? [];
    const myBids = bidsQuery.data ?? [];
    const myUavs = fleetQuery.data?.uavs ?? [];

    const handleRespond = async (missionId: number, accept: boolean) => {
        setErrorMsg('');
        try {
            await respondToOrder.mutateAsync({
                missionId,
                payload: {
                    accept,
                    uavId: accept ? selectedUavByMission[missionId] : undefined,
                    responseNote: accept
                        ? 'Đối tác đã xác nhận lịch bay & thiết bị.'
                        : 'Đối tác bận lịch khai thác trong khung giờ này.',
                },
            });
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể phản hồi đơn đặt.'));
        }
    };

    const handleStart = async (missionId: number) => {
        setErrorMsg('');
        try {
            await startOrder.mutateAsync(missionId);
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể bắt đầu thực hiện chuyến bay.'));
        }
    };

    const handleComplete = async (missionId: number) => {
        const note = (handoverNoteByMission[missionId] ?? '').trim();
        if (!note) {
            setErrorMsg('Vui lòng nhập biên bản kết quả bàn giao trước khi hoàn tất nhiệm vụ.');
            return;
        }
        setErrorMsg('');
        try {
            await completeOrder.mutateAsync({
                missionId,
                payload: {completionNote: note, equipmentCondition: 'Tốt — An toàn sau bay'},
            });
        } catch (err) {
            setErrorMsg(extractActionableError(err, 'Không thể hoàn tất bàn giao.'));
        }
    };

    return (
        <ProviderStudioShell
            title="Điều phối Đơn đặt thuê & Sàn Đấu thầu RFQ"
            subtitle="Xác nhận đơn đặt từ khách hàng, thực hiện chuyến bay bàn giao dữ liệu và gửi báo giá cho các yêu cầu mở."
        >
            {!profileQuery.isLoading && !profile ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center" role="status">
                    <p className="m-0 text-sm font-bold text-slate-900">Hãy hoàn tất Hồ sơ Đối tác để nhận đơn hàng trên sàn.</p>
                    <Link
                        href="/customer/provider/onboarding"
                        className="mt-3 inline-flex h-9 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground"
                    >
                        Đăng ký Đối tác →
                    </Link>
                </div>
            ) : (
                <div className="mx-auto max-w-6xl space-y-5">
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Loại đơn hàng">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'orders'}
                            onClick={() => setActiveTab('orders')}
                            className={`h-9 rounded-control px-4 text-xs font-bold ${
                                activeTab === 'orders' ? 'bg-primary text-primary-foreground' : 'border border-slate-200 bg-white text-slate-700'
                            }`}
                        >
                            Đơn đặt trực tiếp ({orders.length})
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'rfq'}
                            onClick={() => setActiveTab('rfq')}
                            className={`h-9 rounded-control px-4 text-xs font-bold ${
                                activeTab === 'rfq' ? 'bg-primary text-primary-foreground' : 'border border-slate-200 bg-white text-slate-700'
                            }`}
                        >
                            Yêu cầu mở chờ báo giá — Open RFQ ({rfqs.length})
                        </button>
                    </div>

                    {errorMsg && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-danger" role="alert">
                            {errorMsg}
                        </div>
                    )}

                    {activeTab === 'orders' ? (
                        orders.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500" role="status">
                                Chưa có đơn đặt dịch vụ nào gửi tới gian hàng của bạn.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(mission => (
                                    <ProviderDirectOrderCard
                                        key={mission.id}
                                        mission={mission}
                                        myUavs={myUavs}
                                        selectedUavId={selectedUavByMission[mission.id]}
                                        handoverNote={handoverNoteByMission[mission.id] ?? ''}
                                        requireEscrowBeforeStart={requireEscrowBeforeStart}
                                        isResponding={respondToOrder.isPending}
                                        isStarting={startOrder.isPending}
                                        isCompleting={completeOrder.isPending}
                                        onSelectUav={uavId => setSelectedUavByMission(s => ({...s, [mission.id]: uavId}))}
                                        onChangeHandoverNote={note => setHandoverNoteByMission(s => ({...s, [mission.id]: note}))}
                                        onRespond={accept => void handleRespond(mission.id, accept)}
                                        onStart={() => void handleStart(mission.id)}
                                        onComplete={() => void handleComplete(mission.id)}
                                    />
                                ))}
                            </div>
                        )
                    ) : (
                        <ProviderRfqSection
                            rfqEnabled={rfqEnabled}
                            rfqs={rfqs}
                            myBids={myBids}
                            isSubmitting={submitBid.isPending}
                            onSubmitBid={(missionId, payload) => submitBid.mutateAsync({missionId, payload})}
                            onError={setErrorMsg}
                        />
                    )}
                </div>
            )}
        </ProviderStudioShell>
    );
}
