import React from 'react';
import {NativeTabs} from 'expo-router/native-tabs';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useI18n} from '@/providers/I18nContext';
import {colors} from '@/styles/tokens';

/** The system tab bar (Liquid Glass on iOS 26), SF Symbols icons, collapsing while scrolling down. */
export default function CustomerTabs() {
    const {t} = useI18n();
    const {unreadCount} = useNotifications();
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
            <NativeTabs.Trigger name="weather">
                <NativeTabs.Trigger.Icon sf={{default: 'cloud.sun', selected: 'cloud.sun.fill'}} md="partly_cloudy_day"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.weather')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="notifications">
                <NativeTabs.Trigger.Icon sf={{default: 'bell', selected: 'bell.fill'}} md="notifications"/>
                <NativeTabs.Trigger.Label>{t('nav.notifications')}</NativeTabs.Trigger.Label>
                {unreadCount > 0 && <NativeTabs.Trigger.Badge>{unreadCount > 99 ? '99+' : String(unreadCount)}</NativeTabs.Trigger.Badge>}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="account">
                <NativeTabs.Trigger.Icon sf={{default: 'person.crop.circle', selected: 'person.crop.circle.fill'}} md="account_circle"/>
                <NativeTabs.Trigger.Label>{t('nav.profile')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
