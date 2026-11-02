import {useCallback, useEffect, useState} from 'react';
import * as Location from 'expo-location';
import {DEFAULT_MAP_CENTER} from '@/config/env';

export type LocationSource = 'device' | 'default';
type Point = { lat: number; lng: number };

/** The phone's position rounded to ~100 m (the backend's weather cache cell); 'denied' or null when unavailable. */
async function readPosition(ask: boolean): Promise<Point | 'denied' | null> {
    try {
        const current = await Location.getForegroundPermissionsAsync();
        const permission = current.granted || !ask ? current : await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return ask ? 'denied' : null;
        const position = await Location.getLastKnownPositionAsync() ?? await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
        return position ? {lat: Math.round(position.coords.latitude * 1e3) / 1e3, lng: Math.round(position.coords.longitude * 1e3) / 1e3} : null;
    } catch {
        // Location services off or unavailable: keep the default centre.
        return null;
    }
}

/**
 * Where weather is assessed: the phone's position when the user allows it, otherwise the platform's default centre.
 * Opening a screen never prompts; asking is up to the user (the "my location" button calls locate()).
 */
export function useDeviceLocation() {
    const [point, setPoint] = useState<Point>(DEFAULT_MAP_CENTER);
    const [source, setSource] = useState<LocationSource>('default');
    const [denied, setDenied] = useState(false);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        let active = true;
        void readPosition(false).then(found => {
            if (!active || !found || found === 'denied') return;
            setPoint(found);
            setSource('device');
        });
        return () => {
            active = false;
        };
    }, []);

    /** Asks for permission if needed; resolves to the position found (null when refused or unavailable). */
    const locate = useCallback(async (): Promise<Point | null> => {
        setLocating(true);
        const found = await readPosition(true);
        setLocating(false);
        setDenied(found === 'denied');
        if (!found || found === 'denied') return null;
        setPoint(found);
        setSource('device');
        return found;
    }, []);

    return {point, source, denied, locating, locate};
}
