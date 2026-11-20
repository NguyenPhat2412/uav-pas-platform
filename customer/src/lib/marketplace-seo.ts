import type {Metadata} from 'next';
import {marketplaceApi} from '@/api/marketplace/marketplace.api';
import {scenes, serviceScenes} from '@/components/marketing/UavPhoto';
import {pageMetadata} from '@/content/marketing/metadata';
import {services} from '@/content/marketing/site-content';
import {formatListingSeoMeta} from '@/forms/project/project-form';

export async function buildPublicServiceMetadata(slug: string): Promise<Metadata> {
    const path = `/services/${encodeURIComponent(slug)}`;
    const staticService = services.find(item => item.slug === slug);
    if (staticService) {
        const sceneKey = serviceScenes[slug];
        const coverSrc = sceneKey ? scenes[sceneKey].src : scenes.rentalFleet.src;
        return pageMetadata(
            `Dịch vụ: ${staticService.title}`,
            staticService.text,
            path,
            true,
            coverSrc,
        );
    }

    try {
        const detail = await marketplaceApi.getPublicListingBySlug(slug);
        if (detail?.listing) {
            const seo = formatListingSeoMeta(detail.listing);
            return pageMetadata(seo.title, seo.description, path, true, seo.imageUrl);
        }
    } catch {
        // Fallback below when backend is unreachable or slug does not exist.
    }

    return pageMetadata(
        'Chi tiết Gói dịch vụ & Thiết bị UAV',
        'Thông số kỹ thuật, đơn giá minh hoạ và đánh giá nghiệm thu từ Đối tác đã xác minh trên nền tảng UAV PAS.',
        path,
        true,
        scenes.rentalFleet.src,
    );
}
