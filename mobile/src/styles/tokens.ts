// Strict 60-30-10 color hierarchy for UAV PAS Marketplace & Operations:
// - 60% Dominant: Clean neutral surfaces (#f8fafc canvas, #ffffff cards)
// - 30% Secondary: Structural slate & charcoal (#0f172a, #334155, #475569, #f1f5f9, #e2e8f0)
// - 10% Accent: Brand crimson (#ab2523, #fdf2f2) reserved for primary CTAs, prices, and official badges
export const colors = {
    primary: '#ab2523',
    googleBlue: '#4285F4',
    googleGreen: '#34A853',
    googleYellow: '#FBBC05',
    googleRed: '#EA4335',
    primaryHover: '#8f1c1a',
    primaryLight: '#fdf2f2',
    primarySoftBorder: '#f5c2c1',
    slate900: '#0f172a',
    slate: '#475569',
    slateDark: '#334155',
    slateLight: '#f1f5f9',
    surface: '#ffffff',
    canvas: '#f8fafc',
    customerCanvas: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#475569',
    muted: '#64748b',
    border: '#e2e8f0',
    inputBorder: '#cbd5e1',
    danger: '#b42318',
    dangerLight: '#fef3f2',
    warning: '#b54708',
    warningLight: '#fffaeb',
    white: '#ffffff',
    glassSurface: 'rgba(255, 255, 255, 0.92)',
    glassSurfaceSelected: 'rgba(253, 242, 242, 0.96)',
    glassBorder: 'rgba(226, 232, 240, 0.88)',
    glassBorderSelected: 'rgba(171, 37, 35, 0.45)',
    glassSheetSurface: 'rgba(248, 250, 252, 0.98)',
    sheetBackdrop: 'rgba(15, 23, 42, 0.42)',
} as const;

/** App background, top to bottom: a clear brand red tint under the header, warm ivory, then cool slate by the tab bar. */
export const backgroundGradient = ['#f8e1e1', '#f9f3f2', '#e9eef4'] as const;

/**
 * The UAV artwork drawn over that gradient (AppBackground): survey-map contour lines, a dotted map grid, radar rings
 * around the flight base and a dashed flight route with waypoints. Opacities live in the component.
 */
export const backgroundArt = {
    contour: '#64748b',
    grid: '#94a3b8',
    radar: '#ab2523',
    route: '#334155',
} as const;

export const radius = {control: 8, card: 12, sheet: 16} as const;

export const spacing = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32} as const;

export const font = {
    caption: 12,
    small: 13,
    body: 15,
    title: 17,
    heading: 22,
    display: 30,
} as const;

/** Take-off verdict tones, matching CLEARANCE_TONE on the web (GO slate, CAUTION amber, NO_GO red). */
export const clearanceTone = {
    GO: {background: colors.slateLight, text: colors.slateDark},
    CAUTION: {background: colors.warningLight, text: colors.warning},
    NO_GO: {background: colors.dangerLight, text: colors.danger},
    UNAVAILABLE: {background: colors.slateLight, text: colors.textSecondary},
} as const;

/** Apple MapView polygon/circle/marker tones for airspace zones and flight corridors (no hex literals in components). */
export const airspaceMapTone = {
    PROHIBITED: {stroke: '#b42318', fill: 'rgba(180, 35, 24, 0.22)'},
    RESTRICTED: {stroke: '#b54708', fill: 'rgba(181, 71, 8, 0.18)'},
    WARNING: {stroke: '#475569', fill: 'rgba(71, 85, 105, 0.14)'},
    CORRIDOR: {stroke: '#ab2523', fill: 'rgba(171, 37, 35, 0.14)'},
} as const;

/** Apple MapView pins and search rings for the SAR field cockpit. */
export const sarMapTone = {
    lkpPin: '#ab2523',
    driftStroke: '#b54708',
    driftFill: 'rgba(181, 71, 8, 0.14)',
    searchStroke: '#334155',
    searchFill: 'rgba(51, 65, 85, 0.12)',
    stationPin: '#334155',
    uavPin: '#ab2523',
    detectionVerifiedPin: '#ab2523',
    detectionPendingPin: '#b54708',
} as const;
