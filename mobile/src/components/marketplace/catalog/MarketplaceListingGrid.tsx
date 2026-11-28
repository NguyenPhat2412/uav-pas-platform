import React from 'react';
import {StyleSheet, View} from 'react-native';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import type {MarketplaceListing} from '@/shared/types/marketplace.types';
import {spacing} from '@/styles/tokens';

/**
 * 2-column Shopee-style mobile grid for Marketplace flight service cards (UI-GUIDE §3.2).
 * Pairs items two per row with an empty flex spacer on odd totals so card widths never stretch unevenly.
 */
export function MarketplaceListingGrid({items}: { items: MarketplaceListing[] }) {
    const rows: MarketplaceListing[][] = [];
    for (let idx = 0; idx < items.length; idx += 2) {
        rows.push(items.slice(idx, idx + 2));
    }

    return (
        <View style={styles.grid}>
            {rows.map(pair => (
                <View key={pair[0].id} style={styles.row}>
                    <MarketplaceListingCard item={pair[0]} compact/>
                    {pair[1] ? (
                        <MarketplaceListingCard item={pair[1]} compact/>
                    ) : (
                        <View style={styles.spacer}/>
                    )}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm},
    spacer: {flex: 1},
});
