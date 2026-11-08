import React from 'react';
import {TabStack} from '@/components/layout/TabStack';

export interface LayoutMeta {
    segment: string;
    portal: 'auth' | 'customer' | 'operations';
    navigator: 'stack';
}

export const LAYOUT_META: LayoutMeta = {
    segment: 'operations/(tabs)/fleet',
    portal: 'operations',
    navigator: 'stack',
};

/** Expo Router stack layout for the operations fleet tab segment. */
export default function Layout() {
    return <TabStack titleKey="mobile.ops.nav.fleet"/>;
}
