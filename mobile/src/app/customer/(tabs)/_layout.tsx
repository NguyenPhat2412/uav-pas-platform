import React from 'react';
import {NativeTabs} from 'expo-router/native-tabs';
import {usePublicSupportSession} from '@/hooks/support/usePublicSupportMobile';
import {useI18n} from '@/providers/I18nContext';
import {colors} from '@/styles/tokens';

/**
 * System Liquid Glass tab bar ordered along the e-commerce buyer & seller journey:
 * Trang chủ -> Khám phá -> Đơn bay -> Hỗ trợ -> Tôi
 */
export default function CustomerTabs() {
    const {t} = useI18n();
    const {unreadCount} = usePublicSupportSession(false);
    return (
        <NativeTabs tintColor={colors.primary} minimizeBehavior="never" disableTransparentOnScrollEdge>
            <NativeTabs.Trigger name="home">
                <NativeTabs.Trigger.Icon sf={{default: 'house', selected: 'house.fill'}} md="home"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.home')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="services">
                <NativeTabs.Trigger.Icon sf={{default: 'square.grid.2x2', selected: 'square.grid.2x2.fill'}} md="grid_view"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.explore')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="missions">
                <NativeTabs.Trigger.Icon sf={{default: 'folder', selected: 'folder.fill'}} md="folder"/>
                <NativeTabs.Trigger.Label>{t('mobile.overnight.navProjects')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="support">
                <NativeTabs.Trigger.Icon sf={{default: 'bubble.left.and.text.bubble.right', selected: 'bubble.left.and.text.bubble.right.fill'}} md="support_agent"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.support')}</NativeTabs.Trigger.Label>
                {unreadCount > 0 && <NativeTabs.Trigger.Badge>{unreadCount > 99 ? '99+' : String(unreadCount)}</NativeTabs.Trigger.Badge>}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="account">
                <NativeTabs.Trigger.Icon sf={{default: 'person.crop.circle', selected: 'person.crop.circle.fill'}} md="account_circle"/>
                <NativeTabs.Trigger.Label>{t('mobile.nav.me')}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
