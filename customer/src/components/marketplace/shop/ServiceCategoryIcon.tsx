'use client';

import {Award, Camera, Map, Package, Plane, Sparkles, Zap, type LucideIcon} from 'lucide-react';
import type {ServiceCategoryIconName} from '@/lib/marketplace/service-categories';

const ICON_MAP: Record<ServiceCategoryIconName, LucideIcon> = {
    Sparkles,
    Map,
    Zap,
    Camera,
    Plane,
    Award,
    Package,
};

export function ServiceCategoryIcon({
    name,
    size = 20,
    strokeWidth = 1.85,
    className,
}: {
    name: ServiceCategoryIconName;
    size?: number;
    strokeWidth?: number;
    className?: string;
}) {
    const Icon = ICON_MAP[name] ?? Package;
    return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true"/>;
}
