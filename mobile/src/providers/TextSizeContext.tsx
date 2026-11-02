import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {readSavedTextSize, saveTextSize} from '@/lib/storage/preferences';

/** The in-app text size steps (Account → Cỡ chữ); every AppText multiplies its size by the chosen scale. */
export const TEXT_SIZES = [
    {value: 'small', scale: 0.9},
    {value: 'normal', scale: 1},
    {value: 'large', scale: 1.15},
    {value: 'xlarge', scale: 1.3},
] as const;

export type TextSize = (typeof TEXT_SIZES)[number]['value'];

interface TextSizeValue {
    size: TextSize;
    scale: number;
    setSize: (size: TextSize) => void;
}

const TextSizeContext = createContext<TextSizeValue | undefined>(undefined);

const scaleOf = (size: TextSize) => TEXT_SIZES.find(step => step.value === size)?.scale ?? 1;

export function TextSizeProvider({children}: { children: ReactNode }) {
    const [size, setSizeState] = useState<TextSize>('normal');

    useEffect(() => {
        let active = true;
        void readSavedTextSize().then(saved => {
            if (active && TEXT_SIZES.some(step => step.value === saved)) setSizeState(saved as TextSize);
        });
        return () => {
            active = false;
        };
    }, []);

    const setSize = useCallback((next: TextSize) => {
        setSizeState(next);
        void saveTextSize(next);
    }, []);

    const value = useMemo(() => ({size, scale: scaleOf(size), setSize}), [size, setSize]);
    return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

/** The chosen size and its setter (settings screen). */
export function useTextSize(): TextSizeValue {
    const context = useContext(TextSizeContext);
    if (!context) throw new Error('useTextSize must be used within a TextSizeProvider');
    return context;
}

/** The current multiplier; 1 outside the provider (the root error screen). */
export function useTextScale(): number {
    return useContext(TextSizeContext)?.scale ?? 1;
}
