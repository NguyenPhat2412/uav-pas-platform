'use client';

import Image from 'next/image';
import Link from 'next/link';
import {Badge, Card, CardContent, CardFooter} from '@/components/ui';
import {keepVietnamesePhrases} from '@/lib/typography';
import {customerUrl, services} from '@/content/marketing/site-content';
import {serviceDetails} from '@/content/marketing/service-details';
import {useI18n} from '@/providers/I18nContext';
import {FlatTag} from '@/components/marketing/FlatTag';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';
import {scenes, serviceScenes} from '@/components/marketing/UavPhoto';

const capabilitiesBackdrop = {src: '/images/people/usgs-everglades-tracking-test.jpg'};

export function HomeLandingCapabilitiesSection() {
    const {t, locale} = useI18n();
    const shapeVi = (text: string) => (locale === 'vi' ? keepVietnamesePhrases(text) : text);

    const features = [1, 2, 3, 4, 5, 6].map((idx) => ({
        id: `f${idx}`,
        badge: t(`publicSite.capabilities.f${idx}Badge`),
        title: t(`publicSite.capabilities.f${idx}Title`),
        description: t(`publicSite.capabilities.f${idx}Desc`),
        specs: [
            t(`publicSite.capabilities.f${idx}Spec1`),
            t(`publicSite.capabilities.f${idx}Spec2`),
        ],
        portal: t(`publicSite.capabilities.f${idx}Portal`),
    }));

    const serviceItems = services.map((service, index) => {
        const idx = index + 1;
        const detail = serviceDetails[service.slug];
        const sceneKey = serviceScenes[service.slug] ?? 'rentalFleet';
        return {
            slug: service.slug,
            code: detail.code,
            photo: scenes[sceneKey],
            title: t(`publicSite.serviceGroups.s${idx}Title`),
            text: t(`publicSite.serviceGroups.s${idx}Text`),
            onSiteLead: t(`publicSite.serviceGroups.s${idx}Lead`),
            bestGsd: t(`publicSite.serviceGroups.s${idx}Gsd`),
            altitudeRange: t(`publicSite.serviceGroups.s${idx}Alt`),
            maxArea: t(`publicSite.serviceGroups.s${idx}Area`),
            deliverySla: t(`publicSite.serviceGroups.s${idx}Deliv`),
            sensors: detail.sensors,
        };
    });

    return (
        <>
            {/* 6 CORE UAV PLATFORM CAPABILITIES */}
            <section
                className="relative isolate overflow-hidden border-b border-border bg-slate-950 py-16 sm:py-20"
                aria-labelledby="home-capabilities-title"
            >
                <Image
                    src={capabilitiesBackdrop.src}
                    alt=""
                    fill
                    sizes="100vw"
                    className="-z-10 object-cover opacity-45"
                    aria-hidden="true"
                />
                <div
                    className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/85"
                    aria-hidden="true"
                />
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        onPhoto
                        id="home-capabilities-title"
                        eyebrow={t('publicSite.capabilities.eyebrow')}
                        jp={t('publicSite.capabilities.jp')}
                        title={t('publicSite.capabilities.title')}
                        text={t('publicSite.capabilities.text')}
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, index) => (
                            <Card
                                key={feature.id}
                                className="flex flex-col justify-between rounded-2xl border-border shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md"
                            >
                                <CardContent className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <FlatTag>{feature.badge}</FlatTag>
                                        <span className="font-mono text-xs font-bold text-slate-400">
                                            0{index + 1}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-extrabold leading-snug text-foreground">
                                        {shapeVi(feature.title)}
                                    </h3>
                                    <p className="text-xs leading-relaxed text-slate-600">
                                        {feature.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {feature.specs.map((spec) => (
                                            <Badge
                                                key={spec}
                                                variant="outline"
                                                size="sm"
                                                className="rounded-md border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-slate-700"
                                            >
                                                {spec}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-start gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    {t('publicSite.capabilities.portalPrefix')}{' '}
                                    <span className="text-slate-700">{feature.portal}</span>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4 VISUAL UAV SERVICE GROUPS WITH REAL FIELD IMAGERY & COMPACT SPECS */}
            <section
                className="border-b border-border bg-card py-16 sm:py-20"
                aria-labelledby="home-services-catalog-title"
            >
                <div className="mx-auto w-full max-w-[1380px] space-y-10 px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-services-catalog-title"
                        eyebrow={t('publicSite.serviceGroups.eyebrow')}
                        jp={t('publicSite.serviceGroups.jp')}
                        title={t('publicSite.serviceGroups.title')}
                        text={t('publicSite.serviceGroups.text')}
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {serviceItems.map((service) => (
                            <Card
                                key={service.slug}
                                className="group flex flex-col justify-between overflow-hidden rounded-2xl border-border shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md"
                            >
                                <div>
                                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                                        <Image
                                            src={service.photo.src}
                                            alt={service.photo.alt}
                                            fill
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />
                                        <div className="absolute right-4 bottom-3.5 left-4 flex flex-wrap items-center justify-between gap-2">
                                            <FlatTag>{service.code}</FlatTag>
                                            <span className="rounded-badge bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                                                {service.onSiteLead}
                                            </span>
                                        </div>
                                    </div>
                                    <CardContent className="space-y-3.5 pt-4">
                                        <div>
                                            <h3 className="text-lg font-extrabold text-foreground">
                                                {service.title}
                                            </h3>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                {service.text}
                                            </p>
                                        </div>
                                        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs sm:grid-cols-4">
                                            <div>
                                                <dt className="text-[11px] text-slate-400">
                                                    {t('publicSite.serviceGroups.gsd')}
                                                </dt>
                                                <dd className="font-bold text-slate-800">{service.bestGsd}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[11px] text-slate-400">
                                                    {t('publicSite.serviceGroups.altitude')}
                                                </dt>
                                                <dd className="font-bold text-slate-800">
                                                    {service.altitudeRange}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-[11px] text-slate-400">
                                                    {t('publicSite.serviceGroups.range')}
                                                </dt>
                                                <dd className="font-bold text-slate-800">{service.maxArea}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-[11px] text-slate-400">
                                                    {t('publicSite.serviceGroups.delivery')}
                                                </dt>
                                                <dd className="font-bold text-slate-800">
                                                    {service.deliverySla}
                                                </dd>
                                            </div>
                                        </dl>
                                    </CardContent>
                                </div>
                                <CardFooter className="flex-wrap justify-between gap-3 py-3.5">
                                    <Link
                                        href={`/services/${service.slug}`}
                                        className="text-xs font-bold text-primary hover:underline"
                                    >
                                        {t('publicSite.serviceGroups.detailLink')}
                                    </Link>
                                    <Link
                                        href={`${customerUrl}/missions/create`}
                                        className="inline-flex h-8 items-center justify-center rounded-control bg-primary px-3.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                                    >
                                        {t('publicSite.serviceGroups.bookBtn')}
                                    </Link>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
