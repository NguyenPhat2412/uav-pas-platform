'use client';

import {useEffect, useState} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import { Minimize2, Sparkles, X } from 'lucide-react';
import {openAuthModal, OPEN_AUTH_MODAL_EVENT} from '@/components/auth/AuthModalPopup';
import {
    ScrollEngagementStageContent,
    type ScrollEngagementStage,
} from '@/components/marketing/ScrollEngagementStageContent';
import {
    OPEN_SUPPORT_WIDGET_EVENT,
    openPublicSupportWidget,
    usePublicDiscovery,
} from '@/hooks/support/usePublicSupport';
import {useAuth} from '@/providers/AuthContext';

const STAGE_TABS: readonly { key: ScrollEngagementStage; label: string }[] = [
    {key: 'services', label: 'Dịch vụ'},
    {key: 'plans', label: 'Đăng nhập'},
    {key: 'training', label: 'Đào tạo UAV'},
    {key: 'contact', label: 'Thực địa'},
] as const;

function resolveStageFromScroll(ratio: number): ScrollEngagementStage {
    if (ratio < 0.38) return 'services';
    if (ratio < 0.63) return 'plans';
    if (ratio < 0.84) return 'training';
    return 'contact';
}

/**
 * Contextual scroll-triggered floating popup on public marketing pages.
 * Dynamically recommends UAV services, sign-in/plans, UAV training courses, and direct dispatch contact
 * backed by live PostgreSQL data (/api/v1/public/discovery).
 */
export function ScrollEngagementPopup() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const {user} = useAuth();
    const authParamOpen = Boolean(searchParams.get('auth'));

    const [scrolledPastHero, setScrolledPastHero] = useState(false);
    const [scrollStage, setScrollStage] = useState<ScrollEngagementStage>('services');
    const [pinnedStage, setPinnedStage] = useState<ScrollEngagementStage | null>(null);
    const [minimized, setMinimized] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const [selectedServiceIdx, setSelectedServiceIdx] = useState(0);
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(1);
    const [selectedTrainingIdx, setSelectedTrainingIdx] = useState(0);

    const discoveryQuery = usePublicDiscovery(scrolledPastHero && !dismissed);

    useEffect(() => {
        const updateScroll = () => {
            const scrollY = window.scrollY;
            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            const ratio = Math.min(1, Math.max(0, scrollY / maxScroll));

            setScrolledPastHero((prev) => (prev ? scrollY > 180 : scrollY > 320));
            const nextAutoStage = resolveStageFromScroll(ratio);
            setScrollStage((prev) => {
                if (prev !== nextAutoStage) {
                    setPinnedStage(null);
                    return nextAutoStage;
                }
                return prev;
            });
        };

        updateScroll();
        window.addEventListener('scroll', updateScroll, {passive: true});
        return () => window.removeEventListener('scroll', updateScroll);
    }, [pathname]);

    useEffect(() => {
        const collapsePopup = () => setMinimized(true);
        window.addEventListener(OPEN_AUTH_MODAL_EVENT, collapsePopup);
        window.addEventListener(OPEN_SUPPORT_WIDGET_EVENT, collapsePopup);
        return () => {
            window.removeEventListener(OPEN_AUTH_MODAL_EVENT, collapsePopup);
            window.removeEventListener(OPEN_SUPPORT_WIDGET_EVENT, collapsePopup);
        };
    }, []);

    if (dismissed || !scrolledPastHero || authParamOpen || pathname === '/contact') {
        return null;
    }

    const activeStage = pinnedStage ?? scrollStage;

    if (minimized) {
        return (
            <div className="fixed bottom-5 left-5 z-40">
                <button
                    type="button"
                    onClick={() => setMinimized(false)}
                    className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 text-xs font-bold text-slate-900 shadow-xl backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary/50"
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span>Gợi ý Dịch vụ &amp; Đào tạo UAV</span>
                </button>
            </div>
        );
    }

    return (
        <aside
            aria-label="Gợi ý dịch vụ, đăng nhập và đào tạo UAV"
            className="fixed bottom-5 left-5 z-40 w-[calc(100vw-2.5rem)] max-w-[388px] overflow-hidden rounded-2xl border border-slate-200/95 bg-white/98 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-md transition-all duration-300"
        >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-rose-500 to-amber-500" aria-hidden="true" />

            {/* Header & stage switcher */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3.5 py-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {STAGE_TABS.map((tab) => {
                        const active = tab.key === activeStage;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setPinnedStage(tab.key)}
                                className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                                    active
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => setMinimized(true)}
                        aria-label="Thu gọn hộp gợi ý"
                        title="Thu gọn"
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
                    >
                        <Minimize2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        aria-label="Đóng hộp gợi ý"
                        title="Đóng"
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Contextual body */}
            <div className="p-4">
                <ScrollEngagementStageContent
                    stage={activeStage}
                    isSignedIn={Boolean(user)}
                    data={discoveryQuery.data}
                    selectedServiceIdx={selectedServiceIdx}
                    onSelectService={setSelectedServiceIdx}
                    selectedPlanIdx={selectedPlanIdx}
                    onSelectPlan={setSelectedPlanIdx}
                    selectedTrainingIdx={selectedTrainingIdx}
                    onSelectTraining={setSelectedTrainingIdx}
                    onOpenLogin={(next) => {
                        setMinimized(true);
                        openAuthModal('login', next);
                    }}
                    onOpenRegister={() => {
                        setMinimized(true);
                        openAuthModal('register');
                    }}
                    onOpenSupport={(topic, prompt) => {
                        setMinimized(true);
                        openPublicSupportWidget({topic, prompt});
                    }}
                />
            </div>
        </aside>
    );
}
