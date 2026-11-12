import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Redirect, Stack} from 'expo-router';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {AssistantProvider} from '@/providers/AssistantContext';
import {detailHeader} from '@/components/layout/TabStack';
import {AssistantLauncher} from '@/components/assistant/AssistantLauncher';
import {PulsingSupportLauncher} from '@/components/support/PulsingSupportLauncher';
import {canUsePortal} from '@/shared/utils/auth/portal';

/** Field Operations workspace: guarded to ROLE_OPERATOR / ROLE_COMMANDER / ROLE_ADMIN. */
export default function OperationsLayout() {
    const {status, user} = useAuth();
    const {t} = useI18n();
    if (status !== 'signed-in') return <Redirect href="/"/>;
    if (!canUsePortal(user?.role, 'operations')) return <Redirect href="/customer/home"/>;

    return (
        <AssistantProvider>
            <View style={styles.fill}>
                <Stack screenOptions={detailHeader}>
                    <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                    <Stack.Screen name="mission/[id]" options={{title: t('mobile.nav.missionDetail')}}/>
                    <Stack.Screen name="sar/[missionId]" options={{title: t('mobile.ops.sar.cockpitTitle')}}/>
                    <Stack.Screen name="notifications" options={{title: t('nav.notifications')}}/>
                    <Stack.Screen name="profile" options={{title: t('mobile.account.profile')}}/>
                    <Stack.Screen name="security" options={{title: t('mobile.account.security')}}/>
                    <Stack.Screen name="admin-quick" options={{title: t('mobile.adminQuick.title')}}/>
                    <Stack.Screen name="support" options={{title: t('mobile.support.adminTitle')}}/>
                    <Stack.Screen name="training/index" options={{title: t('nav.training')}}/>
                    <Stack.Screen name="training/[slug]" options={{title: t('nav.training')}}/>
                    <Stack.Screen name="training/lesson/[id]" options={{title: t('nav.training')}}/>
                    <Stack.Screen
                        name="assistant"
                        options={{
                            presentation: 'formSheet',
                            sheetAllowedDetents: [0.75, 1],
                            sheetGrabberVisible: true,
                            headerTransparent: false,
                        }}
                    />
                </Stack>
                <PulsingSupportLauncher mode="admin"/>
                <AssistantLauncher/>
            </View>
        </AssistantProvider>
    );
}

const styles = StyleSheet.create({
    fill: {flex: 1},
});
