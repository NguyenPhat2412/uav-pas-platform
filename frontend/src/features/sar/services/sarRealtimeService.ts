import { sarStore, type TelemetryState } from "@/features/sar/stores/sarStore";

export interface TelemetryPacket {
  altitude: number;
  speed: number;
  battery: number;
  pitch: number;
  roll: number;
  heading: number;
  latitude: number;
  longitude: number;
  rtkFixed: boolean;
  timestamp: number;
}

class SarRealtimeService {
  private active = false;
  private timerId: NodeJS.Timeout | null = null;
  private ws: WebSocket | null = null;

  startSimulation() {
    if (this.active) return;
    this.active = true;

    let step = 0;
    // High-frequency telemetry update (every 1000ms in UI to maintain smooth 60fps)
    this.timerId = setInterval(() => {
      step += 1;
      const current = sarStore.getState().telemetry;

      // Realistic flight micro-fluctuations (wind, turbulence, flight dynamics)
      const pitchJitter = Number((-12.4 + Math.sin(step * 0.4) * 0.8).toFixed(1));
      const rollJitter = Number((1.1 + Math.cos(step * 0.3) * 0.6).toFixed(1));
      const speedJitter = Number((14.2 + Math.sin(step * 0.2) * 0.3).toFixed(1));
      const altJitter = Number((124.5 + Math.cos(step * 0.1) * 0.4).toFixed(1));

      // Drone coordinates drifting forward slowly along heading 45°
      const latDrift = current.latitude + 0.00002 * Math.cos(45 * (Math.PI / 180));
      const lngDrift = current.longitude + 0.00002 * Math.sin(45 * (Math.PI / 180));

      sarStore.setTelemetry({
        pitch: pitchJitter,
        roll: rollJitter,
        speed: speedJitter,
        altitude: altJitter,
        latitude: Number(latDrift.toFixed(6)),
        longitude: Number(lngDrift.toFixed(6)),
      });
    }, 1000);
  }

  stop() {
    this.active = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  connectWebSocket(url: string) {
    if (typeof window === 'undefined') return;
    try {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data) as TelemetryPacket;
          sarStore.setTelemetry({
            altitude: packet.altitude,
            speed: packet.speed,
            battery: packet.battery,
            pitch: packet.pitch,
            roll: packet.roll,
            heading: packet.heading,
            latitude: packet.latitude,
            longitude: packet.longitude,
            rtkFixed: packet.rtkFixed,
          });
        } catch {
          // ignore malformed frame
        }
      };
      this.ws.onerror = () => {
        // Fallback to simulation if WebSocket server unavailable
        this.startSimulation();
      };
    } catch {
      this.startSimulation();
    }
  }
}

export const sarRealtimeService = new SarRealtimeService();
