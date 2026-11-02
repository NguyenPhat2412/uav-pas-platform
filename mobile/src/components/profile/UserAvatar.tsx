import React, {useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {AppText} from '@/components/ui';
import {useAvatarSource} from '@/hooks/profile/useProfile';
import {useAuth} from '@/providers/AuthContext';
import {colors} from '@/styles/tokens';

export function initialsOf(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]?.toUpperCase()).join('') || '?';
}

/** The signed-in user's round avatar, with their initials while the picture loads, fails or is not set (web Avatar). */
export function UserAvatar({size}: { size: number }) {
    const {user} = useAuth();
    const source = useAvatarSource();
    const [failed, setFailed] = useState<string | undefined>();
    const name = user?.fullName || user?.username || '';
    return (
        <View style={[styles.avatar, {width: size, height: size, borderRadius: size / 2}]}>
            {source && failed !== source.uri
                ? <Image source={source} style={styles.image} onError={() => setFailed(source.uri)} accessibilityIgnoresInvertColors/>
                : <AppText style={[styles.initials, {fontSize: Math.max(11, Math.round(size * 0.36))}]}>{initialsOf(name)}</AppText>}
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    image: {width: '100%', height: '100%'},
    initials: {color: colors.white, fontWeight: '700'},
});
