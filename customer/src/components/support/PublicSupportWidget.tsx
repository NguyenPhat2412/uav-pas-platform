'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {
    getSupportErrorMessage,
    OPEN_SUPPORT_WIDGET_EVENT,
    PUBLIC_SUPPORT_TOKEN_KEY,
    readStoredSupportToken,
    saveStoredSupportToken,
    SUPPORT_SESSION_EVENT,
    useCreatePublicSupportThread,
    usePublicSiteInfo,
    usePublicSupportSession,
    useSendPublicSupportMessage,
    useSupportVisitorPrefill,
} from '@/hooks/support/usePublicSupport';
import type {
    OpenSupportWidgetDetail,
    SupportQuickTopicOption,
    SupportSessionEventDetail,
    SupportStartDraft,
    SupportWidgetMode,
} from '@/types/support/support.types';
import {PublicSupportLauncher} from '@/components/support/PublicSupportLauncher';
import {PublicSupportChatPanel} from '@/components/support/PublicSupportChatPanel';

export const SUPPORT_QUICK_TOPICS: readonly SupportQuickTopicOption[] = [
    {
        topic: 'SURVEY_SERVICE',
        chipLabel: 'Khảo sát GIS 2D/3D',
        selectLabel: 'Khảo sát bản đồ GIS 2D/3D & Quay chụp',
        starterPrompt: 'Tôi cần tư vấn dịch vụ bay khảo sát lập bản đồ GIS 2D/3D cho khu vực dự án.',
    },
    {
        topic: 'PRICING_PLAN',
        chipLabel: 'Báo giá & Đối soát',
        selectLabel: 'Tư vấn gói cước & Đối soát thanh toán',
        starterPrompt: 'Tôi muốn nhận tư vấn chi tiết và báo giá các gói cước Basic / Pro / Enterprise.',
    },
    {
        topic: 'FLIGHT_PERMIT_NFZ',
        chipLabel: 'Xin phép bay & NFZ',
        selectLabel: 'Kiểm tra vùng hạn chế bay (NFZ) & Xin phép bay',
        starterPrompt: 'Tôi cần hỗ trợ kiểm tra vùng hạn chế bay (NFZ) và thủ tục cấp phép bay cho nhiệm vụ.',
    },
    {
        topic: 'ACCOUNT_DISPATCH',
        chipLabel: 'Cấp tài khoản',
        selectLabel: 'Đăng ký & Cấp tài khoản vận hành',
        starterPrompt: 'Tôi cần hướng dẫn đăng ký hoặc xét duyệt cấp tài khoản vận hành trên hệ thống.',
    },
] as const;

const FOLLOW_UP_CHIPS = [
    'Nhờ Admin báo giá chi tiết',
    'Khu vực bay có vướng NFZ?',
    'Thời gian triển khai dự kiến?',
] as const;

const INITIAL_START_DRAFT: SupportStartDraft = {
    fullName: '',
    organization: '',
    contactInfo: '',
    topic: 'SURVEY_SERVICE',
    message: '',
};

type EditablePrefillField = 'fullName' | 'contactInfo' | 'organization';

export function PublicSupportWidget({mode = 'public'}: {mode?: SupportWidgetMode} = {}) {
    const isPortal = mode === 'portal';
    const [open, setOpen] = useState(false);
    const [visitorToken, setVisitorToken] = useState<string | null>(null);
    const [startDraft, setStartDraft] = useState<SupportStartDraft>(INITIAL_START_DRAFT);
    const [editedPrefill, setEditedPrefill] = useState<Record<EditablePrefillField, boolean>>({
        fullName: false,
        contactInfo: false,
        organization: false,
    });
    const [replyDraft, setReplyDraft] = useState('');
    const [errorText, setErrorText] = useState<string | null>(null);
    const tokenRef = useRef<string | null>(null);

    const prefill = useSupportVisitorPrefill(isPortal, open);

    useEffect(() => {
        const stored = readStoredSupportToken();
        tokenRef.current = stored;
        // Hydrate saved visitor session after mount so SSR markup matches client initial render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (stored) setVisitorToken(stored);
    }, []);

    useEffect(() => {
        tokenRef.current = visitorToken;
    }, [visitorToken]);

    useEffect(() => {
        const onOpenSupport = (event: Event) => {
            const detail = (event as CustomEvent<OpenSupportWidgetDetail>).detail ?? {};
            setErrorText(null);
            setOpen(true);
            if (detail.topic || detail.prompt) {
                if (!tokenRef.current) {
                    setStartDraft((prev) => ({
                        ...prev,
                        topic: detail.topic ?? prev.topic,
                        message: detail.prompt ?? prev.message,
                    }));
                } else if (detail.prompt) {
                    setReplyDraft(detail.prompt);
                }
            }
        };

        const onSessionChange = (event: Event) => {
            const detail = (event as CustomEvent<SupportSessionEventDetail>).detail;
            if (!detail) return;
            tokenRef.current = detail.visitorToken;
            setVisitorToken(detail.visitorToken);
            setErrorText(null);
            if (typeof detail.open === 'boolean') setOpen(detail.open);
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === PUBLIC_SUPPORT_TOKEN_KEY) {
                const next = event.newValue?.trim() || null;
                tokenRef.current = next;
                setVisitorToken(next);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        window.addEventListener(OPEN_SUPPORT_WIDGET_EVENT, onOpenSupport);
        window.addEventListener(SUPPORT_SESSION_EVENT, onSessionChange);
        window.addEventListener('storage', onStorage);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener(OPEN_SUPPORT_WIDGET_EVENT, onOpenSupport);
            window.removeEventListener(SUPPORT_SESSION_EVENT, onSessionChange);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    const siteInfo = usePublicSiteInfo();
    const sessionQuery = usePublicSupportSession(visitorToken, open, isPortal);
    const createThread = useCreatePublicSupportThread();
    const sendMessage = useSendPublicSupportMessage();
    const session = sessionQuery.data;
    const unreadCount = open ? 0 : (session?.unreadForVisitor ?? 0);

    const effectiveStartDraft: SupportStartDraft = {
        ...startDraft,
        fullName: editedPrefill.fullName ? startDraft.fullName : startDraft.fullName || prefill.fullName,
        contactInfo: editedPrefill.contactInfo ? startDraft.contactInfo : startDraft.contactInfo || prefill.contactInfo,
        organization: editedPrefill.organization ? startDraft.organization : startDraft.organization || prefill.organization,
    };

    const handleStartDraftChange = (patch: Partial<SupportStartDraft>) => {
        setStartDraft((prev) => ({...prev, ...patch}));
        if ('fullName' in patch || 'contactInfo' in patch || 'organization' in patch) {
            setEditedPrefill((prev) => ({
                fullName: prev.fullName || 'fullName' in patch,
                contactInfo: prev.contactInfo || 'contactInfo' in patch,
                organization: prev.organization || 'organization' in patch,
            }));
        }
    };

    const handleSelectTopicChip = (option: SupportQuickTopicOption) => {
        const starterSet = new Set(SUPPORT_QUICK_TOPICS.map((item) => item.starterPrompt));
        setStartDraft((prev) => ({
            ...prev,
            topic: option.topic,
            message: !prev.message.trim() || starterSet.has(prev.message.trim()) ? option.starterPrompt : prev.message,
        }));
    };

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        const fullName = effectiveStartDraft.fullName.trim();
        const contactInfo = effectiveStartDraft.contactInfo.trim();
        const message = effectiveStartDraft.message.trim();
        if (!fullName || !contactInfo || !message || createThread.isPending) return;
        setErrorText(null);
        createThread.mutate(
            {
                fullName,
                organization: effectiveStartDraft.organization.trim() || undefined,
                contactInfo,
                topic: effectiveStartDraft.topic,
                source: isPortal ? 'CUSTOMER_PORTAL' : 'LIVE_WIDGET',
                message,
            },
            {
                onSuccess: (created) => {
                    saveStoredSupportToken(created.visitorToken, {open: true});
                    setStartDraft((prev) => ({...prev, message: ''}));
                },
                onError: (err) => setErrorText(getSupportErrorMessage(err)),
            },
        );
    };

    const handleReplyDraftChange = (value: string) => {
        setReplyDraft(value);
        sessionQuery.notifyVisitorTyping(Boolean(value.trim()));
    };

    const handleSendReply = () => {
        const content = replyDraft.trim();
        if (!visitorToken || !content || sendMessage.isPending) return;
        setErrorText(null);
        sessionQuery.notifyVisitorTyping(false);
        sendMessage.mutate(
            {visitorToken, content},
            {
                onSuccess: () => setReplyDraft(''),
                onError: (err) => setErrorText(getSupportErrorMessage(err)),
            },
        );
    };

    const handleResetSession = () => {
        sessionQuery.notifyVisitorTyping(false);
        saveStoredSupportToken(null, {open: true});
        setReplyDraft('');
        setErrorText(null);
    };

    return (
        <>
            {open && (
                <PublicSupportChatPanel
                    mode={mode}
                    hasSession={Boolean(visitorToken)}
                    session={session}
                    wsConnected={sessionQuery.wsConnected}
                    adminTyping={sessionQuery.adminTyping}
                    isSessionLoading={sessionQuery.isPending}
                    isCreating={createThread.isPending}
                    isSending={sendMessage.isPending}
                    errorText={errorText}
                    quickTopics={SUPPORT_QUICK_TOPICS}
                    followUpChips={FOLLOW_UP_CHIPS}
                    startDraft={effectiveStartDraft}
                    replyDraft={replyDraft}
                    onStartDraftChange={handleStartDraftChange}
                    onSelectTopicChip={handleSelectTopicChip}
                    onCreateSubmit={handleCreateSubmit}
                    onReplyDraftChange={handleReplyDraftChange}
                    onSendReply={handleSendReply}
                    onResetSession={handleResetSession}
                    onClose={() => {
                        sessionQuery.notifyVisitorTyping(false);
                        setOpen(false);
                    }}
                    zaloPhone={siteInfo.zaloPhone}
                />
            )}
            <PublicSupportLauncher
                mode={mode}
                open={open}
                unreadCount={unreadCount}
                threadCode={session?.code}
                zaloPhone={siteInfo.zaloPhone}
                onToggle={() => setOpen((prev) => !prev)}
                onOpen={() => setOpen(true)}
            />
        </>
    );
}
