import type {Metadata} from 'next';

export function pageMetadata(
    title: string,
    description: string,
    path: string,
    index = true,
    imageUrl = '/og-default.png',
): Metadata {
    return {
        title,
        description,
        alternates: {canonical: path},
        robots: {index, follow: true},
        openGraph: {title, description, url: path, type: 'website', locale: 'vi_VN', images: [imageUrl]},
        twitter: {card: 'summary_large_image', title, description, images: [imageUrl]},
    };
}
