export type EraIcon = 'kite' | 'kites' | 'agheli' | 'quad' | 'rules' | 'hex' | 'route';

export interface Era {
    year: string;
    title: string;
    text: string;
    tag: string;
    icon: EraIcon;
    current?: boolean;
}

export interface DronePart {
    id: string;
    x: number;
    y: number;
    name: string;
    kicker: string;
    text: string;
    spec: string;
}

export type MissionKind = 'survey' | 'orbit' | 'corridor' | 'rental';

export interface FieldPhoto {
    src: string;
    alt: string;
    caption: string;
    credit: string;
    source: string;
    width: number;
    height: number;
}

export type Readiness = 'AVAILABLE' | 'IN DEVELOPMENT' | 'PLANNED';

export type PlannerPoint = [number, number];

export interface PlannerPlan {
    points: PlannerPoint[];
    area?: PlannerPoint[];
    poi?: PlannerPoint;
    towers?: PlannerPoint[];
    site?: PlannerPoint;
}

export type UavScene =
    | 'field'
    | 'survey'
    | 'team'
    | 'pilots'
    | 'landing'
    | 'mapping'
    | 'tracking'
    | 'response'
    | 'rentalFleet'
    | 'inspectionGrid'
    | 'recordingCinema'
    | 'dataCorridor'
    | 'opsCommand'
    | 'infraSurvey'
    | 'edgePayload'
    | 'sarResponse'
    | 'stepBriefing'
    | 'stepPlanning'
    | 'stepPrep'
    | 'stepRtk'
    | 'stepOrthomosaic'
    | 'researchTeam'
    | 'fieldCommand'
    | 'aboutPreflight'
    | 'aboutGnssBase'
    | 'aboutSensorPayload'
    | 'aboutPilotTeam'
    | 'aboutPortalCustomer'
    | 'aboutPortalOperations'
    | 'aboutPortalAdmin';

export interface UavPlatformFeature {
    id: string;
    badge: string;
    title: string;
    subtitle: string;
    description: string;
    specs: string[];
    portal: string;
    scene: UavScene;
}

export interface PublicPricingPlan {
    code: 'BASIC' | 'PRO' | 'ENTERPRISE';
    name: string;
    subtitle: string;
    monthlyVnd: string;
    billingCycle: string;
    flightHoursQuota: string;
    concurrentUavs: string;
    sarAiIncluded: boolean;
    featured?: boolean;
    badge: string;
    targetAudience: string;
    highlights: string[];
}

export interface PricingComparisonRow {
    feature: string;
    basic: string;
    pro: string;
    enterprise: string;
}

export interface PlatformPortalOverview {
    id: 'customer' | 'operations' | 'admin';
    badge: string;
    title: string;
    role: string;
    description: string;
    capabilities: string[];
    href: string;
    cta: string;
    scene: UavScene;
    imageSrc: string;
    imageAlt: string;
}

export interface ServiceDetailEntry {
    code: string;
    audience: string;
    example: string;
    output: string;
    sensors: string[];
    bestGsd: string;
    altitudeRange: string;
    maxArea: string;
    maxWind: string;
    onSiteSla: string;
    deliverySla: string;
    deliverables: string[];
    useCases: string[];
}

export interface SolutionDetailEntry {
    useCase: string;
    workflow: string;
    limitation: string;
    techStack: string[];
    algorithms: string[];
    deliverables: string[];
}
