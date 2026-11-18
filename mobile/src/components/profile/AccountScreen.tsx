import React from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {ArrowRightLeft, Camera, ChevronRight, Languages, Store, UserRound, type LucideIcon} from 'lucide-react-native';
import {GuestPromptCard} from '@/components/auth/GuestPromptCard';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {AccountFooterActions} from '@/components/profile/AccountFooterActions';
import {AccountQuickGrid} from '@/components/profile/AccountQuickGrid';
import {PushDeviceCard} from '@/components/profile/PushDeviceCard';
import {UserAvatar} from '@/components/profile/UserAvatar';
import {AppText, Badge, Button, Card, Screen} from '@/components/ui';
import {useAvatarMutations} from '@/hooks/profile/useProfile';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useToast} from '@/providers/ToastContext';
import {displayLabel} from '@/shared/lib/presentation';
import {canUsePortal} from '@/shared/utils/auth/portal';
import {colors, radius, spacing} from '@/styles/tokens';

export function AccountRow({icon: Icon, label, onPress, danger = false, right}: {
    icon: LucideIcon;
    label: string;
    onPress: () => void;
    danger?: boolean;
    right?: React.ReactNode;
}) {
    return (
        <Pressable onPress={onPress} accessibilityRole="button" style={({pressed}) => [styles.row, pressed && styles.pressed]}>
            <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
                <Icon size={18} color={danger ? colors.danger : colors.slateDark}/>
            </View>
            <AppText style={[styles.flex, danger ? styles.danger : undefined]}>{label}</AppText>
            {right}
            {!danger && <ChevronRight size={18} color={colors.muted}/>}
        </Pressable>
    );
}

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 5_000_000;

export function AvatarButton() {
    const {t} = useI18n();
    const {user} = useAuth();
    const toast = useToast();
    const {upload, remove} = useAvatarMutations();
    const busy = upload.isPending || remove.isPending;

    const pick = async (source: 'camera' | 'library') => {
        const permission = source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            toast.show(t('mobile.files.permissionDenied'), 'error');
            return;
        }
        const options: ImagePicker.ImagePickerOptions = {mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8};
        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;
        const contentType = asset.mimeType ?? 'image/jpeg';
        if (!AVATAR_TYPES.includes(contentType)) return toast.show(t('avatar.wrongType'), 'error');
        if ((asset.fileSize ?? 0) > AVATAR_MAX_BYTES) return toast.show(t('avatar.tooLarge'), 'error');
        upload.mutate(
            {
                uri: asset.uri,
                name: asset.fileName ?? `avatar-${Date.now()}.${contentType.split('/')[1] ?? 'jpg'}`,
                contentType,
                size: asset.fileSize ?? 0,
            },
            {
                onSuccess: () => toast.show(t('avatar.saved'), 'success'),
                onError: () => toast.show(t('avatar.uploadFailed'), 'error'),
            },
        );
    };

    const choose = () =>
        Alert.alert(t('avatar.title'), undefined, [
            {text: t('mobile.files.camera'), onPress: () => void pick('camera')},
            {text: t('mobile.files.library'), onPress: () => void pick('library')},
            ...(user?.avatarUrl
                ? [
                      {
                          text: t('avatar.remove'),
                          style: 'destructive' as const,
                          onPress: () =>
                              remove.mutate(undefined, {
                                  onSuccess: () => toast.show(t('avatar.removed'), 'success'),
                                  onError: () => toast.show(t('avatar.removeFailed'), 'error'),
                              }),
                      },
                  ]
                : []),
            {text: t('common.cancel'), style: 'cancel'},
        ]);

    return (
        <Pressable
            onPress={choose}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={user?.avatarUrl ? t('avatar.change') : t('avatar.upload')}
            style={({pressed}) => pressed && styles.pressed}>
            <View>
                <UserAvatar size={64}/>
                {busy && (
                    <View style={styles.avatarBusy}>
                        <ActivityIndicator color={colors.white}/>
                    </View>
                )}
            </View>
            <View style={styles.cameraBadge}>
                <Camera size={14} color={colors.slateDark}/>
            </View>
        </Pressable>
    );
}

/**
 * Shopee-inspired "Tôi" (Me) hub uniting Buyer account shortcuts + Prominent Seller Center ("Kênh Người Bán").
 */
export function AccountScreen() {
    const {t} = useI18n();
    const {status, user, switchPortal} = useAuth();
    const router = useRouter();

    if (status !== 'signed-in') {
        return (
            <Screen>
                <GuestPromptCard
                    icon={UserRound}
                    title={t('mobile.shop.guestAccountTitle')}
                    description={t('mobile.shop.guestAccountDesc')}
                    showSellerTeaser
                />
                <Card>
                    <AccountRow
                        icon={Languages}
                        label={t('mobile.account.moreTitle')}
                        onPress={() => router.push('/customer/account-more')}
                    />
                </Card>
                <AppText variant="caption" style={styles.version}>
                    NguyenPhat2412 · UAV PAS
                </AppText>
            </Screen>
        );
    }

    const name = user?.fullName || user?.username || '';
    const canSwitchToOps = canUsePortal(user?.role, 'operations');

    const enterOperationsPortal = async () => {
        await switchPortal('operations');
        router.replace('/operations/missions');
    };

    return (
        <Screen>
            <Card style={styles.identityCard}>
                <View style={styles.identity}>
                    <AvatarButton/>
                    <View style={styles.flex}>
                        <AppText variant="title" numberOfLines={1}>
                            {name}
                        </AppText>
                        <AppText variant="small" numberOfLines={1}>
                            {user?.email}
                        </AppText>
                        {user?.role ? (
                            <Badge
                                label={displayLabel(user.role)}
                                background={colors.slateLight}
                                color={colors.slateDark}
                            />
                        ) : null}
                    </View>
                </View>
            </Card>

            {canSwitchToOps && (
                <Stack.Screen
                    options={{
                        headerRight: () => (
                            <HeaderIconButton
                                icon={ArrowRightLeft}
                                label={t('mobile.workspace.switchToOperations')}
                                onPress={() => void enterOperationsPortal()}
                            />
                        ),
                    }}
                />
            )}

            <AccountQuickGrid/>

            <Card style={styles.sellerCenterCard} onPress={() => router.push('/customer/provider')}>
                <View style={styles.sellerTopRow}>
                    <View style={styles.sellerBadgeBox}>
                        <Store size={20} color={colors.white}/>
                    </View>
                    <View style={styles.flex}>
                        <AppText variant="caption" style={styles.sellerEyebrow}>
                            {t('mobile.shop.sellerCardBadge')}
                        </AppText>
                        <AppText variant="title" style={styles.sellerTitle}>
                            {t('mobile.shop.sellerCardTitle')}
                        </AppText>
                    </View>
                </View>
                <AppText variant="small" style={styles.sellerDesc}>
                    {t('mobile.shop.sellerCardDesc')}
                </AppText>
                <Button
                    size="sm"
                    icon={Store}
                    label={t('mobile.shop.sellerOpenBtn')}
                    onPress={() => router.push('/customer/provider')}
                />
            </Card>

            <PushDeviceCard/>

            <AccountFooterActions/>

            <AppText variant="caption" style={styles.version}>
                NguyenPhat2412 · UAV PAS
            </AppText>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    identityCard: {padding: spacing.md},
    identity: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
    avatarBusy: {
        ...StyleSheet.absoluteFill,
        borderRadius: 32,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm},
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: radius.control,
        backgroundColor: colors.slateLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowIconDanger: {backgroundColor: colors.dangerLight},
    danger: {color: colors.danger, fontWeight: '600'},
    sellerCenterCard: {
        backgroundColor: colors.slate900,
        borderColor: colors.slateDark,
        gap: spacing.sm,
    },
    sellerTopRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    sellerBadgeBox: {
        width: 40,
        height: 40,
        borderRadius: radius.card,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sellerEyebrow: {color: colors.primarySoftBorder, fontWeight: '700'},
    sellerTitle: {color: colors.white},
    sellerDesc: {color: colors.border},
    pressed: {opacity: 0.7},
    version: {textAlign: 'center'},
});
