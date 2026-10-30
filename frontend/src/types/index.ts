export type Translate = (key: string, params?: Record<string, string | number>) => string;

export type PresentationLocale = 'vi' | 'en' | 'ja';
export type SupportedLocale = PresentationLocale;
export type LocaleInput = SupportedLocale | 'vn' | 'nv' | 'jp';

export interface LocaleMeta {
    code: SupportedLocale;
    displayCode: string;
    name: string;
    nativeName: string;
    flag: string;
}

export interface I18nContextType {
    locale: SupportedLocale;
    localeMeta: LocaleMeta;
    setLocale: (locale: LocaleInput) => void;
    toggleLocale: () => void;
    isVietnamese: boolean;
    isEnglish: boolean;
    isJapanese: boolean;
    t: Translate;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
    formatCurrency: (amount: number, currency?: string) => string;
}

export interface TimelineEvent {
    id: number;
    eventType: string;
    newStatus?: string;
    oldStatus?: string;
    description?: string;
    actor?: string;
    createdAt?: string;
}

export interface CollectionPage<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
}

export type Deliverable = 'geotaggedPhotos' | 'video' | 'inspectionReport' | 'flightLog' | 'dataSummary';

export type WeatherHourlyKey =
    | 'temperature_2m'
    | 'relative_humidity_2m'
    | 'wind_speed_10m'
    | 'wind_gusts_10m'
    | 'wind_direction_10m'
    | 'visibility'
    | 'precipitation_probability';

export interface SiteWeather {
    time: string;
    forecast: boolean;
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windGusts?: number;
    windDirection?: number;
    visibility?: number;
    precipitationProbability?: number;
}

export interface PublicEnv {
    NEXT_PUBLIC_API_URL: string;
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_ENVIRONMENT: 'local' | 'staging' | 'production';
    NEXT_PUBLIC_DISPATCH_HOTLINE?: string;
    NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string;
}

export type ApiRoutes = Record<string, Record<string, string | ((...args: never[]) => string)>>;


export type Tone = 'blue' | 'red' | 'amber' | 'slate';

export type Basemap = 'streets' | 'satellite' | 'terrain' | 'dark';
export type TacticalBasemap = Basemap;

export type MessageRecord = Record<string, unknown>;

export type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown;
    token?: string;
    headers?: HeadersInit;
};

export interface SessionTokens {
    accessToken?: string;
    refreshToken?: string;
}

export type ApiError = {
    status: number;
    error?: string;
    code?: string;
    message?: string;
    path?: string;
    timestamp?: string;
    /** Request field to message, for errors that belong to one input. */
    fields?: Record<string, string>;
};

export type Page<T> = {
    content: T[];
    totalElements: number;
    totalPages: number;
    number?: number;
    size?: number;
};

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    hasNext: boolean;
    hasPrevious: boolean;
}

export interface AuditLog {
    id: number;
    actorUserId?: number;
    actorUsername: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    createdAt: string;
}

export type InvoiceStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface ServicePlan {
    id: number;
    code: string;
    name: string;
    price: number;
    billingCycle: string;
    maxMonthlyFlightHours: number;
    maxConcurrentUavs: number;
    allowSarAi: boolean;
    description?: string;
    active: boolean;
}

export interface UserQuota {
    id: number;
    userId: number;
    username: string;
    fullName?: string;
    planCode: string;
    planName: string;
    flightHoursUsed: number;
    flightHoursLimit: number;
    flightHoursRemaining: number;
    concurrentUavsUsed: number;
    concurrentUavsLimit: number;
    cycleStart: string;
    cycleEnd: string;
}

export interface Invoice {
    id: number;
    code: string;
    userId: number;
    username: string;
    missionId?: number;
    missionTitle?: string;
    planId?: number;
    planName?: string;
    amount: number;
    status: InvoiceStatus;
    dueDate: string;
    paidAt?: string;
    notes?: string;
    createdAt: string;
}

export * from './ui';

