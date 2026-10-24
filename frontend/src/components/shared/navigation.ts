/** Match complete URL segments, choosing the most specific visible destination. */
export function activeDestination<T extends {
    href: string
}>(items: readonly T[], pathname: string, resource?: string): T | undefined {
    const path = pathname.replace(/\/+$/, '') || '/';
    const match = items.filter(item => path === item.href || (item.href !== '/' && path.startsWith(`${item.href}/`)))
        .sort((a, b) => b.href.length - a.href.length)[0];
    return match ?? items.find(item => resource && (item.href.slice(1) === resource || item.href.startsWith(`/${resource}/`)));
}
