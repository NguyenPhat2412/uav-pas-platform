import type { Metadata } from 'next';

export function pageMetadata(title: string, description: string, path: string, index = true): Metadata {
  return {
    title, description, alternates: { canonical: path },
    robots: { index, follow: true },
    openGraph: { title, description, url: path, type: 'website', images: ['/og-default.png'] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-default.png'] },
  };
}
