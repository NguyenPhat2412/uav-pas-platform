import { Badge } from '@/components/ui';
import { MissionStatus } from '../types/mission.types';

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const variant = status === 'COMPLETED' ? 'success' : status === 'FAILED' || status === 'CANCELLED' ? 'error' : status === 'IN_PROGRESS' ? 'primary' : 'warning';
  return <Badge variant={variant}>{status.replaceAll('_', ' ')}</Badge>;
}
