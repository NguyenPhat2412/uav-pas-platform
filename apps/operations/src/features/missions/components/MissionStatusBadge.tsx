import { displayLabel } from '@uav/ui/presentation';
import type { MissionStatus } from '../types/mission.types';
export function MissionStatusBadge({ status }: { status: MissionStatus }) { return <span className="mission-status" data-status={status}>{displayLabel(status)}</span>; }
