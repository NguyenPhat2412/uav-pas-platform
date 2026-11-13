import React from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, View} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {ArrowRightLeft, Camera, ChevronRight, type LucideIcon} from 'lucide-react-native';
import {AppText, Screen} from '@/components/ui';
import {HeaderIconButton} from '@/components/layout/AppHeader';
import {AccountFooterActions} from '@/components/profile/AccountFooterActions';
import {AccountQuickGrid} from '@/components/profile/AccountQuickGrid';
import {PushDeviceCard} from '@/components/profile/PushDeviceCard';
import {UserAvatar} from '@/components/profile/UserAvatar';
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
            <View style={[styles.rowIcon, danger && styles.rowIconDanger]}><Icon size={18} color={danger ? colors.danger : colors.slateDark}/></View>
            <AppText style={[styles.flex, danger ? styles.danger : undefined]}>{label}</AppText>
            {right}
            {!danger && <ChevronRight size={18} color={colors.muted}/>}
        </Pressable>
    );
}

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 5_000_000;

/** The avatar at the top of the tab: tap to take a photo, pick one (cropped square) or remove it; same 5 MB rule as the web. */
export function AvatarButton() {
    const {t} = useI18n();
    const {user} = useAuth();
    const toast = useToast();
    const {upload, remove} = useAvatarMutations();
    const busy = upload.isPending || remove.isPending;

    const pick = async (source: 'camera' | 'library') => {
        const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            toast.show(t('mobile.files.permissionDenied'), 'error');
            return;
        }
        const options: ImagePicker.ImagePickerOptions = {mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8};
        const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;
        const contentType = asset.mimeType ?? 'image/jpeg';
        if (!AVATAR_TYPES.includes(contentType)) return toast.show(t('avatar.wrongType'), 'error');
        if ((asset.fileSize ?? 0) > AVATAR_MAX_BYTES) return toast.show(t('avatar.tooLarge'), 'error');
        upload.mutate({
            uri: asset.uri,
            name: asset.fileName ?? `avatar-${Date.now()}.${contentType.split('/')[1] ?? 'jpg'}`,
            contentType,
            size: asset.fileSize ?? 0,
        }, {
            onSuccess: () => toast.show(t('avatar.saved'), 'success'),
            onError: () => toast.show(t('avatar.uploadFailed'), 'error'),
        });
    };

    const choose = () => Alert.alert(t('avatar.title'), undefined, [
        {text: t('mobile.files.camera'), onPress: () => void pick('camera')},
        {text: t('mobile.files.library'), onPress: () => void pick('library')},
        ...(user?.avatarUrl ? [{
            text: t('avatar.remove'), style: 'destructive' as const,
            onPress: () => remove.mutate(undefined, {
                onSuccess: () => toast.show(t('avatar.removed'), 'success'),
                onError: () => toast.show(t('avatar.removeFailed'), 'error'),
            }),
        }] : []),
        {text: t('common.cancel'), style: 'cancel'},
    ]);

    return (
        <Pressable onPress={choose} disabled={busy} accessibilityRole="button" accessibilityLabel={user?.avatarUrl ? t('avatar.change') : t('avatar.upload')}
                   style={({pressed}) => pressed && styles.pressed}>
            <View>
                <UserAvatar size={64}/>
                {busy && <View style={styles.avatarBusy}><ActivityIndicator color={colors.white}/></View>}
            </View>
            <View style={styles.cameraBadge}><Camera size={14} color={colors.slateDark}/></View>
        </Pressable>
    );
}

export function AccountScreen() {
    const {t} = useI18n();
    const {user, switchPortal} = useAuth();
    const router = useRouter();
    const name = user?.fullName || user?.username || '';
    const canSwitchToOps = canUsePortal(user?.role, 'operations');

    const enterOperationsPortal = async () => {
        await switchPortal('operations');
        router.replace('/operations/missions');
    };

    return (
        <Screen>
            <View style={styles.identity}>
                <AvatarButton/>
                <View style={styles.flex}>
                    <AppText variant="title" numberOfLines={1}>{name}</AppText>
                    <AppText variant="small" numberOfLines={1}>{user?.email}</AppText>
                    {user?.role ? <AppText variant="caption">{displayLabel(user.role)}</AppText> : null}
                </View>
            </View>

            {/* Staff switch portals from a round button beside the "Tài khoản" title instead of a full card. */}
            {canSwitchToOps && (
                <Stack.Screen options={{
                    headerRight: () => <HeaderIconButton icon={ArrowRightLeft} label={t('mobile.workspace.switchToOperations')}
                                                         onPress={() => void enterOperationsPortal()}/>,
                }}/>
            )}

            <AccountQuickGrid/>

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
    identity: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
    avatarBusy: {...StyleSheet.absoluteFill, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center'},
    cameraBadge: {
        position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    },
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm},
    rowIcon: {width: 36, height: 36, borderRadius: radius.control, backgroundColor: colors.slateLight, alignItems: 'center', justifyContent: 'center'},
    rowIconDanger: {backgroundColor: colors.dangerLight},
    danger: {color: colors.danger, fontWeight: '600'},
    pressed: {opacity: 0.7},
    version: {textAlign: 'center'},
});
