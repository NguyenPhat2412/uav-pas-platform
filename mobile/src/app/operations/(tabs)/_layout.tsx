import React from 'react';
import {NativeTabs} from 'expo-router/native-tabs';
import {useNotifications} from '@/hooks/notification/useNotifications';
import {useI18n} from '@/providers/I18nContext';
import {colors} from '@/styles/tokens';

/** Operations Field Portal native iOS tab bar with SF Symbols and unread inbox badge. */
export default function OperationsTabs() {
    const {t} = useI18n();
    const {unreadCount} = useNotifications();
    return (
        <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown">
            <NativeTabs.Trigger name="missions">
                <NativeTabs.Trigger.Icon sf={{default: 'airplane.departure', selected: 'airplane.departure'}} md="flight_takeoff"/>
                <NativeTabs.Trigger.Label>{t('mobile.ops.tabs.missions')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="sar">
                <NativeTabs.Trigger.Icon sf={{default: 'scope', selected: 'scope'}} md="radar"/>
                <NativeTabs.Trigger.Label>{t('mobile.ops.tabs.sar')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="fleet">
                <NativeTabs.Trigger.Icon
                    sf={{default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill'}}
                    md="build"
                />
                <NativeTabs.Trigger.Label>{t('mobile.ops.tabs.fleet')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="weather">
                <NativeTabs.Trigger.Icon sf={{default: 'cloud.sun', selected: 'cloud.sun.fill'}} md="partly_cloudy_day"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.weather')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="account">
                <NativeTabs.Trigger.Icon sf={{default: 'person.crop.circle', selected: 'person.crop.circle.fill'}} md="account_circle"/>
                <NativeTabs.Trigger.Label>{t('nav.profile')}</NativeTabs.Trigger.Label>
                {unreadCount > 0 && (
                    <NativeTabs.Trigger.Badge>{unreadCount > 99 ? '99+' : String(unreadCount)}</NativeTabs.Trigger.Badge>
                )}
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
