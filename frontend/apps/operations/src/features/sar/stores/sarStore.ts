import { useSyncExternalStore } from 'react';
import type { DetectionItem } from '../components/AiViewfinder';

export interface TelemetryState {
  altitude: number;
  speed: number;
  battery: number;
  pitch: number;
  roll: number;
  heading: number;
  latitude: number;
  longitude: number;
  rtkFixed: boolean;
  satellites: number;
  signal5gPercent: number;
}

export interface Kv260Metrics {
  dpuLoadPercent: number;
  fps: number;
  latencyMs: number;
  temperatureC: number;
  model: string;
}

export interface SarStoreState {
  telemetry: TelemetryState;
  kv260: Kv260Metrics;
  selectedCandidate: DetectionItem | null;
  confidenceThreshold: number;
  isGeneratedPath: boolean;
  alertSuccess: string | null;
}

const initialTelemetry: TelemetryState = {
  altitude: 124.5,
  speed: 14.2,
  battery: 68,
  pitch: -12.4,
  roll: 1.1,
  heading: 45,
  latitude: 20.7310,
  longitude: 107.0540,
  rtkFixed: true,
  satellites: 28,
  signal5gPercent: 94,
};

const initialKv260: Kv260Metrics = {
  dpuLoadPercent: 78,
  fps: 28.6,
  latencyMs: 18.4,
  temperatureC: 54.2,
  model: 'YOLOv8s-Int8-DPU-B4096',
};

class SarStore {
  private state: SarStoreState = {
    telemetry: initialTelemetry,
    kv260: initialKv260,
    selectedCandidate: null,
    confidenceThreshold: 75,
    isGeneratedPath: false,
    alertSuccess: null,
  };

  private listeners = new Set<() => void>();

  getState = (): SarStoreState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  setTelemetry(partial: Partial<TelemetryState>) {
    this.state = {
      ...this.state,
      telemetry: { ...this.state.telemetry, ...partial },
    };
    this.notify();
  }

  setKv260(partial: Partial<Kv260Metrics>) {
    this.state = {
      ...this.state,
      kv260: { ...this.state.kv260, ...partial },
    };
    this.notify();
  }

  setSelectedCandidate(candidate: DetectionItem | null) {
    if (this.state.selectedCandidate?.id === candidate?.id) return;
    this.state = { ...this.state, selectedCandidate: candidate };
    this.notify();
  }

  setConfidenceThreshold(threshold: number) {
    if (this.state.confidenceThreshold === threshold) return;
    this.state = { ...this.state, confidenceThreshold: threshold };
    this.notify();
  }

  setIsGeneratedPath(generated: boolean) {
    if (this.state.isGeneratedPath === generated) return;
    this.state = { ...this.state, isGeneratedPath: generated };
    this.notify();
  }

  setAlert(message: string | null) {
    this.state = { ...this.state, alertSuccess: message };
    this.notify();
  }
}

export const sarStore = new SarStore();

/**
 * Custom React 19 Hook with selective subscription to prevent cascading re-renders.
 */
export function useSarStore<T>(selector: (state: SarStoreState) => T): T {
  return useSyncExternalStore(
    sarStore.subscribe,
    () => selector(sarStore.getState()),
    () => selector(sarStore.getState())
  );
}
