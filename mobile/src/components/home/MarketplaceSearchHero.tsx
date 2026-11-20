import React, {useState} from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
    type ImageSourcePropType,
} from 'react-native';
import {useRouter} from 'expo-router';
import {Search, ShieldCheck} from 'lucide-react-native';
import {AppText, Badge, CONTENT_WIDTH} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {colors, radius, spacing} from '@/styles/tokens';

const HERO_IMAGES: readonly ImageSourcePropType[] = [
    require('../../../assets/hero/uav-hero-1.webp') as ImageSourcePropType,
    require('../../../assets/hero/uav-hero-2.webp') as ImageSourcePropType,
    require('../../../assets/hero/uav-hero-3.webp') as ImageSourcePropType,
];

/**
 * Shopee-style top search bar + swipeable 3-slide real UAV photo banner (UI-GUIDE §3.1 & §4).
 */
export function MarketplaceSearchHero() {
    const {t} = useI18n();
    const router = useRouter();
    const {width} = useWindowDimensions();
    const [activeSlide, setActiveSlide] = useState(0);
    const [frameWidth, setFrameWidth] = useState(0);
    const slideWidth =
        frameWidth > 0
            ? frameWidth
            : Math.max(260, Math.min(width, CONTENT_WIDTH) - spacing.lg * 2);

    const slides = [
        {
            key: 's1',
            image: HERO_IMAGES[0],
            title: t('mobile.overnight.slide1Title'),
            sub: t('mobile.overnight.slide1Sub'),
        },
        {
            key: 's2',
            image: HERO_IMAGES[1],
            title: t('mobile.overnight.slide2Title'),
            sub: t('mobile.overnight.slide2Sub'),
        },
        {
            key: 's3',
            image: HERO_IMAGES[2],
            title: t('mobile.overnight.slide3Title'),
            sub: t('mobile.overnight.slide3Sub'),
        },
    ];

    return (
        <View style={styles.wrap}>
            <Pressable
                accessibilityRole="search"
                accessibilityLabel={t('mobile.shop.searchFakePlaceholder')}
                onPress={() => router.navigate('/customer/services')}
                style={({pressed}) => [styles.searchBar, pressed && styles.pressed]}>
                <Search size={18} color={colors.primary}/>
                <AppText variant="small" style={styles.searchPlaceholder} numberOfLines={1}>
                    {t('mobile.shop.searchFakePlaceholder')}
                </AppText>
            </Pressable>

            <View
                style={styles.carouselFrame}
                onLayout={event => {
                    const next = Math.round(event.nativeEvent.layout.width);
                    if (next > 0 && next !== frameWidth) setFrameWidth(next);
                }}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={event => {
                        const idx = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
                        setActiveSlide(Math.max(0, Math.min(slides.length - 1, idx)));
                    }}>
                    {slides.map(slide => (
                        <Pressable
                            key={slide.key}
                            accessibilityRole="button"
                            accessibilityLabel={slide.title}
                            onPress={() => router.navigate('/customer/services')}
                            style={[styles.slide, {width: slideWidth}]}>
                            <Image
                                source={slide.image}
                                style={styles.slideImage}
                                resizeMode="cover"
                                accessibilityLabel={slide.title}
                            />
                            <View style={styles.slideOverlay}>
                                <Badge
                                    icon={ShieldCheck}
                                    label={t('mobile.shop.mallBadge')}
                                    background={colors.primary}
                                    color={colors.white}
                                />
                                <AppText variant="title" style={styles.slideTitle} numberOfLines={2}>
                                    {slide.title}
                                </AppText>
                                <AppText variant="caption" style={styles.slideSub} numberOfLines={1}>
                                    {slide.sub}
                                </AppText>
                            </View>
                        </Pressable>
                    ))}
                </ScrollView>
                <View style={styles.dotsRow}>
                    {slides.map((slide, idx) => (
                        <View
                            key={slide.key}
                            style={[styles.dot, idx === activeSlide && styles.dotActive]}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: spacing.md},
    searchBar: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.primarySoftBorder,
    },
    searchPlaceholder: {flex: 1, color: colors.muted},
    carouselFrame: {
        borderRadius: radius.card,
        overflow: 'hidden',
        backgroundColor: colors.slate900,
    },
    slide: {minHeight: 164, justifyContent: 'flex-end'},
    slideImage: {...StyleSheet.absoluteFill, width: '100%', height: '100%'},
    slideOverlay: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
        gap: 4,
        backgroundColor: colors.sheetBackdrop,
    },
    slideTitle: {color: colors.white, fontWeight: '700'},
    slideSub: {color: colors.border},
    dotsRow: {
        position: 'absolute',
        bottom: 8,
        right: spacing.md,
        flexDirection: 'row',
        gap: 5,
    },
    dot: {width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inputBorder},
    dotActive: {width: 16, backgroundColor: colors.primary},
    pressed: {opacity: 0.8},
});
