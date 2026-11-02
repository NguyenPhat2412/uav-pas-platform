import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Redirect, Stack} from 'expo-router';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {AssistantProvider} from '@/providers/AssistantContext';
import {detailHeader} from '@/components/layout/TabStack';
import {AssistantLauncher} from '@/components/assistant/AssistantLauncher';

/** Signed-in area: tabs, detail screens pushed on top under AppHeader (back / close button), and the assistant over the tabs. */
export default function CustomerLayout() {
    const {status} = useAuth();
    const {t} = useI18n();
    if (status !== 'signed-in') return <Redirect href="/"/>;
    return (
        <AssistantProvider>
            <View style={styles.fill}>
                <Stack screenOptions={detailHeader}>
                    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                    <Stack.Screen name="mission/create" options={{title: t('missions.create'), presentation: 'modal'}}/>
                    <Stack.Screen name="mission/[id]/index" options={{title: t('mobile.nav.missionDetail')}}/>
                    <Stack.Screen name="mission/[id]/edit" options={{title: t('missionDetail.editDraft'), presentation: 'modal'}}/>
                    <Stack.Screen name="services" options={{title: t('nav.services')}}/>
                    <Stack.Screen name="billing" options={{title: t('nav.billing')}}/>
                    <Stack.Screen name="invoices/[id]" options={{title: t('mobile.billing.payTitle')}}/>
                    <Stack.Screen name="profile" options={{title: t('mobile.account.profile')}}/>
                    <Stack.Screen name="security" options={{title: t('mobile.account.security')}}/>
                    <Stack.Screen name="training/index" options={{title: t('nav.training')}}/>
                    <Stack.Screen name="training/[slug]" options={{title: t('nav.training')}}/>
                    <Stack.Screen name="training/lesson/[id]" options={{title: t('nav.training')}}/>
                    {/* The chat opens as a native sheet: pull it to full height or swipe it away. */}
                    <Stack.Screen name="assistant" options={{presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, headerTransparent: false}}/>
                </Stack>
                <AssistantLauncher/>
            </View>
        </AssistantProvider>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
});
