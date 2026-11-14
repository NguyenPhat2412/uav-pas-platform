import React from 'react';
import {TabStack} from '@/components/layout/TabStack';

export interface LayoutMeta {
    segment: string;
    portal: 'auth' | 'customer' | 'operations';
    navigator: 'stack';
}

export const LAYOUT_META: LayoutMeta = {
    segment: 'customer/(tabs)/services',
    portal: 'customer',
    navigator: 'stack',
};

/** Expo Router stack layout for the customer UAV service catalog tab segment. */
export default function Layout() {
    return <TabStack titleKey="nav.services"/>;
}
