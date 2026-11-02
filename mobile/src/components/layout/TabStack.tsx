import React from 'react';
import {Stack} from 'expo-router';
import {AppHeader} from '@/components/layout/AppHeader';
import {useI18n} from '@/providers/I18nContext';
import {colors} from '@/styles/tokens';

/**
 * Every stack uses AppHeader, laid out above the content. It replaced the transparent Liquid Glass bar, which let the
 * content scroll under the title and the back button and made both unreadable.
 */
export const detailHeader = {
    header: AppHeader,
    headerTransparent: false,
    contentStyle: {backgroundColor: colors.canvas},
} as const;

/** One tab: a stack whose root screen shows a bold, left-aligned title and no back button. */
export function TabStack({titleKey}: { titleKey: string }) {
    const {t} = useI18n();
    return (
        <Stack screenOptions={detailHeader}>
            <Stack.Screen name="index" options={{title: t(titleKey), headerBackVisible: false, headerTitleAlign: 'left'}}/>
        </Stack>
    );
}
