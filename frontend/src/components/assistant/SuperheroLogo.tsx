/** The assistant's mascot: a cute superhero head in VJU red and engineering blue. Decorative unless a title is given. */
export function SuperheroLogo({size = 40, title}: { size?: number; title?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
            {title && <title>{title}</title>}
            {/* helmet with fin */}
            <path d="M32 3 L37 11 L27 11 Z" fill="#475569"/>
            <circle cx="32" cy="34" r="25" fill="#475569"/>
            {/* face */}
            <ellipse cx="32" cy="38" rx="20" ry="19" fill="#ffd9b8"/>
            {/* lightning emblem on the helmet */}
            <path d="M33.5 13 L28.5 21 L32 21 L30 27 L36 18.5 L32.5 18.5 Z" fill="#fbbf24" stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round"/>
            {/* mask */}
            <path d="M11 33 Q32 24 53 33 L53 41 Q43 45 36 40 Q32 37.5 28 40 Q21 45 11 41 Z" fill="#ab2523"/>
            {/* eyes */}
            <ellipse cx="23" cy="36.5" rx="5.2" ry="5.6" fill="#ffffff"/>
            <ellipse cx="41" cy="36.5" rx="5.2" ry="5.6" fill="#ffffff"/>
            <circle cx="24" cy="37.5" r="3" fill="#1e293b"/>
            <circle cx="40" cy="37.5" r="3" fill="#1e293b"/>
            <circle cx="25.2" cy="36.2" r="1.1" fill="#ffffff"/>
            <circle cx="41.2" cy="36.2" r="1.1" fill="#ffffff"/>
            {/* cheeks and smile */}
            <ellipse cx="17.5" cy="47" rx="3.2" ry="2" fill="#f9a8a8" opacity="0.8"/>
            <ellipse cx="46.5" cy="47" rx="3.2" ry="2" fill="#f9a8a8" opacity="0.8"/>
            <path d="M26.5 48.5 Q32 54 37.5 48.5" fill="none" stroke="#7c2d12" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
    );
}
