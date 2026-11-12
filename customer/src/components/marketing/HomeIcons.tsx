import type {EraIcon, MissionKind} from "@/content/marketing/home-content";

const stroke = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;

const eraPaths: Record<EraIcon, React.ReactNode> = {
    kite: <><path d="M60 4l16 20-16 22-16-22z"/><path d="M44 24h32M60 4v42"/><path d="M60 46c-4 6 4 8 0 14" strokeDasharray="2 3"/><rect x="54" y="52" width="12" height="8" rx="1.5"/></>,
    kites: <><path d="M30 6l8 10-8 11-8-11zM60 2l8 10-8 11-8-11zM90 6l8 10-8 11-8-11z"/><path d="M30 27l30 22M60 23v26M90 27L60 49"/><rect x="50" y="49" width="20" height="11" rx="2"/><circle cx="60" cy="54.5" r="3"/></>,
    agheli: <><path d="M14 14h92M60 14v8"/><path d="M38 28c0-4 6-6 18-6h10c10 0 15 6 15 13s-5 11-15 11H49c-7 0-11-5-11-11z"/><path d="M81 34h22l4-7M46 46l-4 8h36l-4-8"/><path d="M30 58h60" strokeDasharray="1 5"/></>,
    quad: <><rect x="50" y="24" width="20" height="16" rx="5"/><path d="M52 26L37 13M68 26l15-13M52 38L37 51M68 38l15 13"/><circle cx="34" cy="11" r="9"/><circle cx="86" cy="11" r="9"/><circle cx="34" cy="53" r="9"/><circle cx="86" cy="53" r="9"/></>,
    rules: <><path d="M38 8h36l10 10v38H38z"/><path d="M74 8v10h10M46 28h28M46 36h28M46 44h18"/></>,
    hex: <><rect x="50" y="22" width="20" height="20" rx="4"/><path d="M50 32H26M70 32h24M55 22L42 8M65 22l13-14M55 42L42 56M65 42l13 14"/><circle cx="22" cy="32" r="7"/><circle cx="98" cy="32" r="7"/><circle cx="40" cy="6" r="5"/><circle cx="80" cy="6" r="5"/><circle cx="40" cy="58" r="5"/><circle cx="80" cy="58" r="5"/></>,
    route: <><path d="M10 54h100M10 40h100M10 26h100M30 10v50M60 10v50M90 10v50" strokeOpacity=".25"/><path d="M14 50L42 30l26 12 34-30" strokeWidth="2.2"/><circle cx="14" cy="50" r="3.5" fill="currentColor"/><circle cx="42" cy="30" r="3.5"/><circle cx="68" cy="42" r="3.5"/><circle cx="102" cy="12" r="3.5" fill="currentColor"/></>,
};

export function EraSilhouette({icon}: { icon: EraIcon }) {
    return <svg viewBox="0 0 120 64" {...stroke} aria-hidden="true">{eraPaths[icon]}</svg>;
}

const missionPaths: Record<MissionKind, React.ReactNode> = {
    survey: <path d="M4 4v16M9 20V4M14 4v16M19 20V4M4 4h5M9 20h5M14 4h5"/>,
    orbit: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M20 12h-3"/></>,
    corridor: <><path d="M3 18l5-5 5 2 8-9"/><circle cx="3" cy="18" r="1.5"/><circle cx="8" cy="13" r="1.5"/><circle cx="13" cy="15" r="1.5"/><circle cx="21" cy="6" r="1.5"/></>,
    rental: <path d="M4 20h6v-4H4zM7 16c2-8 8-11 13-11M17 3l3 2-2 3"/>,
};

export function MissionIcon({kind}: { kind: MissionKind }) {
    return <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8} aria-hidden="true">{missionPaths[kind]}</svg>;
}
