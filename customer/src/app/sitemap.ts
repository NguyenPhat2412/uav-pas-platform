import type {MetadataRoute} from 'next';
import {publicUrl, services, solutions} from "@/content/marketing/site-content";

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        '/', '/about', '/services', '/solutions', '/how-it-works', '/digital-twin', '/pricing', '/contact', '/faq', '/credits',
        ...services.map(({slug}) => `/services/${slug}`),
        ...solutions.map(({slug}) => `/solutions/${slug}`),
    ];
    return routes.map((route) => ({url: `${publicUrl}${route}`}));
}
