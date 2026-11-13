import React from 'react';
import {NativeTabs} from 'expo-router/native-tabs';
import {usePublicSupportSession} from '@/hooks/support/usePublicSupportMobile';
import {useI18n} from '@/providers/I18nContext';
import {colors} from '@/styles/tokens';

/**
 * The system tab bar (Liquid Glass on iOS 26), SF Symbols icons, collapsing while scrolling down. It carries what a
 * customer comes for: overview, missions, services and contact; weather and notifications open from the home screen.
 */
export default function CustomerTabs() {
    const {t} = useI18n();
    const {unreadCount} = usePublicSupportSession(false);
    return (
        <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown">
            <NativeTabs.Trigger name="home">
                <NativeTabs.Trigger.Icon sf={{default: 'house', selected: 'house.fill'}} md="home"/>
                <NativeTabs.Trigger.Label>{t('nav.dashboard')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="missions">
                <NativeTabs.Trigger.Icon sf={{default: 'list.bullet.clipboard', selected: 'list.bullet.clipboard.fill'}} md="assignment"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.missions')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="services">
                <NativeTabs.Trigger.Icon sf={{default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill'}} md="layers"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.services')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="support">
                <NativeTabs.Trigger.Icon sf={{default: 'bubble.left.and.text.bubble.right', selected: 'bubble.left.and.text.bubble.right.fill'}} md="support_agent"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.support')}</NativeTabs.Trigger.Label>
                {unreadCount > 0 && <NativeTabs.Trigger.Badge>{unreadCount > 99 ? '99+' : String(unreadCount)}</NativeTabs.Trigger.Badge>}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="account">
                <NativeTabs.Trigger.Icon sf={{default: 'person.crop.circle', selected: 'person.crop.circle.fill'}} md="account_circle"/>
                <NativeTabs.Trigger.Label>{t('nav.profile')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
