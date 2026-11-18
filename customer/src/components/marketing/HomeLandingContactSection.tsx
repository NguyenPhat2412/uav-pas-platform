'use client';

import Image from 'next/image';
import {
    Clock3,
    ExternalLink,
    Headset,
    Mail,
    MapPin,
    MessageCircleMore,
    PhoneCall,
    ShieldCheck,
} from 'lucide-react';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';
import {ContactQuickForm} from '@/components/marketing/ContactQuickForm';
import {ZaloBrandIcon} from '@/components/support/ZaloBrandIcon';
import {openPublicSupportWidget, usePublicSiteInfo} from '@/hooks/support/usePublicSupport';
import {useI18n} from '@/providers/I18nContext';
import {formatPhoneDisplay, toTelHref, toZaloChatUrl} from '@/utils/support/contact-format';

export function HomeLandingContactSection() {
    const {t} = useI18n();
    const siteInfo = usePublicSiteInfo();

    const zaloUrl = toZaloChatUrl(siteInfo.zaloPhone);
    const zaloDisplay = formatPhoneDisplay(siteInfo.zaloPhone);
    const hotlineDisplay = formatPhoneDisplay(siteInfo.dispatchHotline);
    const hotlineTel = toTelHref(siteInfo.dispatchHotline);
    const email = siteInfo.email ?? '';
    const address = siteInfo.address ?? '';
    const hasDirectChannels = Boolean(zaloUrl || hotlineTel || email || address);

    const quickPrompts = [
        {
            label: t('publicSite.contact.p1Label'),
            topic: 'SURVEY_SERVICE',
            prompt: t('publicSite.contact.p1Prompt'),
        },
        {
            label: t('publicSite.contact.p2Label'),
            topic: 'ACCOUNT_DISPATCH',
            prompt: t('publicSite.contact.p2Prompt'),
        },
        {
            label: t('publicSite.contact.p3Label'),
            topic: 'FLIGHT_PERMIT_NFZ',
            prompt: t('publicSite.contact.p3Prompt'),
        },
    ];

    return (
        <section
            id="contact-support"
            aria-labelledby="home-contact-title"
            className="border-t border-b border-border bg-background py-16 sm:py-20"
        >
            <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                <HomeLandingSectionHead
                    id="home-contact-title"
                    eyebrow={t('publicSite.contact.eyebrow')}
                    jp={t('publicSite.contact.jp')}
                    title={t('publicSite.contact.title')}
                    text={t('publicSite.contact.text')}
                />

                <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
                    <div className="flex flex-col justify-between gap-5 lg:col-span-5">
                        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                                <Image
                                    src="/images/contact/uav-consultant-desk.jpg"
                                    alt={t('publicSite.contact.cardTitle')}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 42vw"
                                    className="object-cover object-top"
                                />
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent"
                                    aria-hidden="true"
                                />

                                <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-900 shadow-sm backdrop-blur-xs">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                        </span>
                                        {t('publicSite.contact.onlineBadge')}
                                    </span>
                                </div>

                                <div className="absolute right-4 bottom-3.5 left-4 text-white">
                                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
                                        <Headset className="h-3.5 w-3.5" aria-hidden="true" />
                                        {t('publicSite.contact.cardTag')}
                                    </p>
                                    <h3 className="mt-0.5 text-base font-extrabold leading-snug sm:text-lg">
                                        {t('publicSite.contact.cardTitle')}
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-4 p-5">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <Clock3
                                            className="h-3.5 w-3.5 text-primary"
                                            aria-hidden="true"
                                        />
                                        {t('publicSite.contact.fastReply')}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                        <ShieldCheck
                                            className="h-3.5 w-3.5 text-primary"
                                            aria-hidden="true"
                                        />
                                        {t('publicSite.contact.nfzSupport')}
                                    </span>
                                </div>

                                <div className="space-y-2 border-t border-slate-100 pt-3.5">
                                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        {t('publicSite.contact.quickPromptLabel')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {quickPrompts.map((item) => (
                                            <button
                                                key={item.topic}
                                                type="button"
                                                onClick={() =>
                                                    openPublicSupportWidget({
                                                        topic: item.topic,
                                                        prompt: item.prompt,
                                                    })
                                                }
                                                className="cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-primary hover:bg-uav-red-light hover:text-primary"
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openPublicSupportWidget()}
                                    className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                                >
                                    <MessageCircleMore className="h-4 w-4" aria-hidden="true" />
                                    <span>{t('publicSite.contact.chatNow')}</span>
                                </button>
                            </div>
                        </div>

                        {hasDirectChannels && (
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                                <span className="mb-3 block text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                                    {t('publicSite.contact.directChannelsTitle')}
                                </span>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {hotlineTel && (
                                        <a
                                            href={hotlineTel}
                                            className="group flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 transition-colors hover:border-primary hover:bg-uav-red-light/50"
                                        >
                                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <PhoneCall
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    {t('publicSite.contact.hotlineLabel')}
                                                </span>
                                                <span className="block truncate text-xs font-extrabold text-slate-900 group-hover:text-primary">
                                                    {hotlineDisplay}
                                                </span>
                                            </span>
                                        </a>
                                    )}

                                    {zaloUrl && (
                                        <a
                                            href={zaloUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 transition-colors hover:border-slate-400 hover:bg-white"
                                        >
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <ZaloBrandIcon className="h-8 w-8 text-slate-900" />
                                                <span className="min-w-0">
                                                    <span className="block text-[11px] font-semibold text-slate-500">
                                                        {t('publicSite.contact.zaloLabel')}
                                                    </span>
                                                    <span className="block truncate text-xs font-extrabold text-slate-900">
                                                        {zaloDisplay}
                                                    </span>
                                                </span>
                                            </span>
                                            <ExternalLink
                                                className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-700"
                                                aria-hidden="true"
                                            />
                                        </a>
                                    )}

                                    {email && (
                                        <a
                                            href={`mailto:${email}`}
                                            className="group flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 transition-colors hover:border-slate-400 hover:bg-white sm:col-span-2"
                                        >
                                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200/90">
                                                <Mail className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    {t('publicSite.contact.emailLabel')}
                                                </span>
                                                <span className="block truncate text-xs font-extrabold text-slate-900 group-hover:text-primary">
                                                    {email}
                                                </span>
                                            </span>
                                        </a>
                                    )}

                                    {address && (
                                        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 sm:col-span-2">
                                            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200/90">
                                                <MapPin className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[11px] font-semibold text-slate-500">
                                                    {t('publicSite.contact.officeLabel')}
                                                </span>
                                                <span className="mt-0.5 block text-xs font-bold leading-relaxed text-slate-800">
                                                    {address}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8 lg:col-span-7">
                        <div className="mb-5 space-y-1.5 border-b border-slate-100 pb-4">
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
                                {t('publicSite.contact.formEyebrow')}
                            </span>
                            <h3 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                                {t('publicSite.contact.formTitle')}
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-500">
                                {t('publicSite.contact.formSubtitle')}
                            </p>
                        </div>

                        <ContactQuickForm />
                    </div>
                </div>
            </div>
        </section>
    );
}
