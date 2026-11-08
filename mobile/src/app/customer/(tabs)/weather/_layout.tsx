import React from 'react';
import {TabStack} from '@/components/layout/TabStack';

export interface LayoutMeta {
    segment: string;
    portal: 'auth' | 'customer' | 'operations';
    navigator: 'stack';
}

export const LAYOUT_META: LayoutMeta = {
    segment: 'customer/(tabs)/weather',
    portal: 'customer',
    navigator: 'stack',
};

/** Expo Router stack layout for the customer weather tab segment. */
export default function Layout() {
    return <TabStack titleKey="nav.weather"/>;
}
