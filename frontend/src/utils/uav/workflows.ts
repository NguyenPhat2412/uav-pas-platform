import type {Translate} from '@/types';
import {translateMessage} from '@/lib/format';

export type {Translate};

// Without a translator the Vietnamese default is returned, which keeps these helpers usable outside React.
const message = (t: Translate | undefined, key: string, fallback: string, params?: Record<string, string | number>) =>
    translateMessage(t, `opsAssets.uavWorkflow.${key}`, fallback, params);

/** The API requires a reason of at most 255 characters and reports it on the reason field. */
export function uavChangeReason(value: string) {
    return value.trim();
}

/** Display affordances only. Active mission references are checked by the API. */
export function uavControls(status: string, canManage: boolean) {
    return {
        maintenance: canManage && ['AVAILABLE', 'INACTIVE'].includes(status),
        recover: canManage && ['MAINTENANCE', 'ASSIGNED'].includes(status),
        station: canManage && status === 'AVAILABLE',
        busy: ['ASSIGNED', 'IN_USE'].includes(status),
    };
}


export function uavHistoryReason(value?: string, t?: Translate) {
    if (!value) return '';
    if (value === 'Created') return message(t, 'created', 'Tạo UAV');
    const repair = /^Repair order #([0-9]+) (started|completed)$/.exec(value);
    if (repair) return repair[2] === 'started'
        ? message(t, 'repairStarted', `Bắt đầu phiếu sửa chữa #${repair[1]}`, {id: repair[1]})
        : message(t, 'repairCompleted', `Hoàn tất phiếu sửa chữa #${repair[1]}`, {id: repair[1]});
    const transfer = /^Home station changed: (none|[0-9]+) -> ([0-9]+)$/.exec(value);
    if (transfer) {
        const from = transfer[1] === 'none' ? message(t, 'unassigned', 'Chưa gán') : `#${transfer[1]}`;
        return message(t, 'stationTransfer', `Điều chuyển trạm: ${from} → #${transfer[2]}`, {from, to: transfer[2]});
    }
    return value;
}
