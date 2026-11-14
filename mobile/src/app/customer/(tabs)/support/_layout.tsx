import React from 'react';
import {TabStack} from '@/components/layout/TabStack';

export interface LayoutMeta {
    segment: string;
    portal: 'auth' | 'customer' | 'operations';
    navigator: 'stack';
}

export const LAYOUT_META: LayoutMeta = {
    segment: 'customer/(tabs)/support',
    portal: 'customer',
    navigator: 'stack',
};

/** Expo Router stack layout for the customer contact and live support chat tab segment. */
export default function Layout() {
    return <TabStack titleKey="mobile.support.publicTitle"/>;
}
