'use client';

import {useCallback, useEffect, useState} from 'react';
import {RefreshCw, RotateCcw, ServerOff, ShieldCheck, WifiOff, Wrench} from 'lucide-react';
import {probeApiHealth, TRANSPORT_EVENT, type TransportState} from '@/lib/api';

type SupportedLang = 'vi' | 'en' | 'ja';
type OverlayMode = 'offline' | 'server_unreachable' | 'maintenance';

interface ModeText {
    badge: string;
    title: string;
    detail: string;
    pill: string;
}

interface LocaleCopy {
    modes: Record<OverlayMode, ModeText>;
    wifiTip: string;
    sessionTip: string;
    syncTip: string;
    retry: string;
    viewCached: string;
    footer: string;
}

const COPY: Record<SupportedLang, LocaleCopy> = {
    vi: {
        modes: {
            offline: {
                badge: 'Đang mất kết nối',
                title: 'Đang mất kết nối mạng',
                detail: 'Đường truyền tới Trung tâm Điều phối UAV PAS đang tạm gián đoạn. Kiểm tra lại Wi-Fi hoặc mạng di động rồi thử kết nối lại.',
                pill: 'Đang ngoại tuyến · Nhấn để kiểm tra kết nối',
            },
            server_unreachable: {
                badge: 'Gián đoạn đường truyền',
                title: 'Chưa kết nối được máy chủ điều phối',
                detail: 'Thiết bị vẫn có mạng nhưng máy chủ UAV PAS tạm thời chưa phản hồi. Phiên đăng nhập vẫn được giữ an toàn — hãy bấm Thử kết nối lại.',
                pill: 'Máy chủ tạm gián đoạn · Nhấn để kiểm tra',
            },
            maintenance: {
                badge: 'Bảo trì hệ thống',
                title: 'Hệ thống đang bảo trì hoặc khởi động lại',
                detail: 'Dịch vụ điều phối UAV PAS đang cập nhật hoặc khởi động lại ngắn hạn. Dữ liệu và phiên đăng nhập vẫn an toàn — thử lại sau ít giây.',
                pill: 'Hệ thống đang bảo trì · Nhấn để kiểm tra',
            },
        },
        wifiTip: 'Kiểm tra tín hiệu mạng hoặc trạng thái máy chủ điều phối',
        sessionTip: 'Phiên đăng nhập và dữ liệu đang mở vẫn được giữ an toàn',
        syncTip: 'Tự động đồng bộ trở lại ngay khi kết nối khôi phục',
        retry: 'Thử kết nối lại',
        viewCached: 'Tạm xem trang hiện tại',
        footer: 'UAV PAS · Điều phối & Vận hành Bay',
    },
    en: {
        modes: {
            offline: {
                badge: 'Connection lost',
                title: 'No network connection',
                detail: 'The link to UAV PAS Dispatch Center is temporarily interrupted. Check your Wi-Fi or network connection and try again.',
                pill: 'Offline · Click to check connection',
            },
            server_unreachable: {
                badge: 'Telemetry link interrupted',
                title: 'Unable to reach dispatch server',
                detail: 'Your network is active, but the UAV PAS server is not responding yet. Your active session stays protected — please retry.',
                pill: 'Server unreachable · Click to check',
            },
            maintenance: {
                badge: 'System maintenance',
                title: 'System maintenance or restart in progress',
                detail: 'UAV PAS dispatch services are briefly restarting or updating. Your session remains safe — retry in a few seconds.',
                pill: 'Maintenance in progress · Click to check',
            },
        },
        wifiTip: 'Check your Wi-Fi signal or dispatch server availability',
        sessionTip: 'Your active session and current screen remain protected',
        syncTip: 'Automatically syncs as soon as connection returns',
        retry: 'Reconnect now',
        viewCached: 'View current page',
        footer: 'UAV PAS · Flight Dispatch & Operations',
    },
    ja: {
        modes: {
            offline: {
                badge: '接続が切断されました',
                title: 'ネットワーク接続がありません',
                detail: 'UAV PAS 運用センターへの通信が一時的に中断しています。Wi-Fi またはネットワーク接続を確認して再試行してください。',
                pill: 'オフライン · クリックして接続を確認',
            },
            server_unreachable: {
                badge: '通信リンク中断',
                title: '運用サーバーに接続できません',
                detail: 'ネットワークは有効ですが、UAV PAS サーバーから応答がありません。ログイン状態は安全に保持されています — 再試行してください。',
                pill: 'サーバー応答なし · クリックして確認',
            },
            maintenance: {
                badge: 'システムメンテナンス',
                title: 'メンテナンスまたは再起動中です',
                detail: 'UAV PAS 運用サービスが短期メンテナンスまたは更新中です。ログイン状態は保持されています — 数秒後に再試行してください。',
                pill: 'メンテナンス中 · クリックして確認',
            },
        },
        wifiTip: 'Wi-Fi 信号または運用サーバーの状態を確認してください',
        sessionTip: 'ログイン状態と表示中の画面は安全に保持されています',
        syncTip: '接続が回復し次第、自動的に同期します',
        retry: '再接続する',
        viewCached: '現在の画面を見る',
        footer: 'UAV PAS · 飛行運用管理プラットフォーム',
    },
};

function readLang(): SupportedLang {
    if (typeof window === 'undefined') return 'vi';
    try {
        const stored = window.localStorage.getItem('uav_locale') ?? document.documentElement.lang;
        if (stored === 'en' || stored === 'ja') return stored;
    } catch { /* ignore storage restrictions */ }
    return 'vi';
}

function LostLinkDroneSvg() {
    return (
        <svg viewBox="0 0 280 136" className="mx-auto h-auto w-56 sm:w-64" role="presentation" aria-hidden="true">
            <circle cx="46" cy="88" r="32" fill="#fef2f2"/>
            <circle cx="46" cy="88" r="22" fill="none" stroke="#c43a4a" strokeOpacity="0.3" strokeWidth="1.4"/>
            <path d="M33 106 L46 76 L59 106 Z" fill="#0f172a"/>
            <circle cx="46" cy="74" r="4.5" fill="#b91c1c"/>

            <path d="M58 72 C 88 54, 106 56, 122 64" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round"/>
            <path d="M158 64 C 176 56, 196 54, 216 60" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round"/>

            <circle cx="140" cy="66" r="15" fill="#ffffff" stroke="#b91c1c" strokeWidth="2" strokeDasharray="4 3"/>
            <line x1="134" y1="60" x2="146" y2="72" stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="146" y1="60" x2="134" y2="72" stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round"/>

            <g className="motion-safe:animate-[uav-offline-hover_3.2s_ease-in-out_infinite]" style={{transformBox: 'fill-box', transformOrigin: 'center'}}>
                <line x1="200" y1="58" x2="254" y2="58" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
                <line x1="200" y1="58" x2="194" y2="50" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
                <line x1="254" y1="58" x2="260" y2="50" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
                <ellipse cx="194" cy="48" rx="15" ry="3" fill="#cbd5e1"/>
                <ellipse cx="260" cy="48" rx="15" ry="3" fill="#cbd5e1"/>
                <rect x="213" y="53" width="28" height="18" rx="6" fill="#0f172a"/>
                <circle cx="227" cy="62" r="4" fill="#ffffff"/>
                <circle cx="227" cy="62" r="1.8" fill="#b91c1c"/>
                <line x1="219" y1="71" x2="215" y2="81" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="235" y1="71" x2="239" y2="81" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"/>
            </g>
            <style>{'@keyframes uav-offline-hover{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}'}</style>
        </svg>
    );
}

/** Full-screen UAV PAS Connection & Maintenance status overlay across Customer, Operations, and Admin portals. */
export function OfflineConnectionOverlay() {
    const [browserOffline, setBrowserOffline] = useState(false);
    const [transportState, setTransportState] = useState<TransportState>('online');
    const [dismissed, setDismissed] = useState(false);
    const [checking, setChecking] = useState(false);
    const [lang, setLang] = useState<SupportedLang>('vi');

    useEffect(() => {
        setLang(readLang());
        const syncNetwork = () => {
            const offline = !window.navigator.onLine;
            setBrowserOffline(offline);
            if (!offline) {
                void probeApiHealth();
            }
        };
        const onTransport = (event: Event) => {
            const detail = (event as CustomEvent<{ state?: TransportState }>).detail;
            if (!detail?.state) return;
            setTransportState(detail.state);
            if (detail.state === 'online') setDismissed(false);
        };
        setBrowserOffline(!window.navigator.onLine);
        window.addEventListener('offline', syncNetwork);
        window.addEventListener('online', syncNetwork);
        window.addEventListener(TRANSPORT_EVENT, onTransport);
        return () => {
            window.removeEventListener('offline', syncNetwork);
            window.removeEventListener('online', syncNetwork);
            window.removeEventListener(TRANSPORT_EVENT, onTransport);
        };
    }, []);

    const handleRetry = useCallback(async () => {
        setChecking(true);
        setLang(readLang());
        const online = window.navigator.onLine;
        setBrowserOffline(!online);
        if (online) {
            const state = await probeApiHealth();
            setTransportState(state);
            if (state === 'online') {
                setDismissed(false);
                window.dispatchEvent(new Event('online'));
            }
        }
        setChecking(false);
    }, []);

    const activeMode: OverlayMode | null = browserOffline
        ? 'offline'
        : transportState === 'maintenance'
            ? 'maintenance'
            : transportState === 'server_unreachable'
                ? 'server_unreachable'
                : null;

    if (!activeMode) return null;

    const copy = COPY[lang];
    const modeCopy = copy.modes[activeMode];
    const ModeIcon = activeMode === 'maintenance' ? Wrench : activeMode === 'server_unreachable' ? ServerOff : WifiOff;

    if (dismissed) {
        return (
            <button
                type="button"
                onClick={() => setDismissed(false)}
                className="fixed top-3 left-1/2 z-[120] inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-red-100">
                <ModeIcon size={14} aria-hidden="true"/>
                <span>{modeCopy.pill}</span>
            </button>
        );
    }

    return (
        <div
            role="alert"
            aria-live="assertive"
            className="fixed inset-0 z-[120] flex flex-col justify-between overflow-y-auto bg-slate-50/95 px-4 py-8 text-slate-900 backdrop-blur-sm">
            <div className="mx-auto inline-flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/uav-pas-logo.svg" alt="" width={32} height={32} className="h-8 w-8"/>
                <span>UAV<span className="text-primary">PAS</span></span>
            </div>

            <div className="m-auto w-full max-w-lg rounded-panel border border-slate-200 border-t-4 border-t-primary bg-white p-6 text-center shadow-sm sm:p-8">
                <LostLinkDroneSvg/>

                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-uav-red-light px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                    <ModeIcon size={13} aria-hidden="true"/>
                    {modeCopy.badge}
                </p>

                <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{modeCopy.title}</h1>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{modeCopy.detail}</p>

                <ul className="mt-5 space-y-2.5 rounded-control border border-slate-200 bg-slate-50 p-4 text-left text-xs text-slate-700">
                    <li className="flex items-center gap-2.5">
                        <ModeIcon size={15} className="shrink-0 text-primary" aria-hidden="true"/>
                        <span>{copy.wifiTip}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                        <ShieldCheck size={15} className="shrink-0 text-primary" aria-hidden="true"/>
                        <span>{copy.sessionTip}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                        <RefreshCw size={15} className="shrink-0 text-primary" aria-hidden="true"/>
                        <span>{copy.syncTip}</span>
                    </li>
                </ul>

                <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                    <button
                        type="button"
                        disabled={checking}
                        onClick={() => void handleRetry()}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60 sm:w-auto">
                        <RotateCcw size={14} className={checking ? 'animate-spin' : undefined} aria-hidden="true"/>
                        {copy.retry}
                    </button>
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        className="inline-flex h-10 w-full items-center justify-center rounded-control border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">
                        {copy.viewCached}
                    </button>
                </div>
            </div>

            <p className="mx-auto pt-4 text-xs text-slate-400">{copy.footer}</p>
        </div>
    );
}
